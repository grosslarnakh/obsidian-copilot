import { TFile, TFolder } from "obsidian";
import { getMatchingPatterns, shouldIndexFile } from "@/search/searchUtils";
import { z } from "zod";
import { createLangChainTool } from "./createLangChainTool";

interface FileTreeNode {
  files?: string[];
  subFolders?: Record<string, FileTreeNode>;
  extensionCounts?: Record<string, number>;
}

function isTFolder(item: any): item is TFolder {
  return "children" in item && "path" in item;
}

function isTFile(item: any): item is TFile {
  return "path" in item && !("children" in item);
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

/**
 * Builds a nested file tree from a folder.
 *
 * @param folder - Obsidian folder to traverse
 * @param includeFiles - Whether to include file names in nodes
 * @param includeEmptyFolders - When true, empty folders are included in the tree; when false they are omitted (default)
 * @returns Record keyed by folder name (or "vault" for root) with FileTreeNode value
 */
function buildFileTree(
  folder: TFolder,
  includeFiles: boolean = true,
  includeEmptyFolders: boolean = false
): Record<string, FileTreeNode> {
  const files: string[] = [];
  const extensionCounts: Record<string, number> = {};
  const subFolders: Record<string, FileTreeNode> = {};

  // Get exclusion patterns from settings
  const { inclusions, exclusions } = getMatchingPatterns();

  // Separate files and folders
  for (const child of folder.children) {
    if (isTFile(child)) {
      // Only include file if it passes the pattern checks
      if (shouldIndexFile(child, inclusions, exclusions)) {
        // Only add to files array if we're including files
        if (includeFiles) {
          files.push(child.name);
        }

        // Always count file extensions
        const ext = getFileExtension(child.name) || "unknown";
        if (ext) {
          extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        }
      }
    } else if (isTFolder(child)) {
      const subResult = buildFileTree(child, includeFiles, includeEmptyFolders);
      const childNode = subResult[child.name];
      const hasContent = childNode !== undefined;

      if (hasContent) {
        subFolders[child.name] = childNode;

        // Merge extension counts from subfolders
        if (childNode.extensionCounts) {
          for (const [ext, count] of Object.entries(childNode.extensionCounts)) {
            extensionCounts[ext] = (extensionCounts[ext] || 0) + count;
          }
        }
      }
    }
  }

  // If this is root folder, name it "vault" and return merged result
  // Create node for either root or named folder
  const node: FileTreeNode = {};
  const hasFiles = Object.keys(extensionCounts).length > 0;
  const hasSubFolders = Object.keys(subFolders).length > 0;
  const isEmpty = !hasFiles && !hasSubFolders;

  if (Object.keys(extensionCounts).length > 0) {
    node.extensionCounts = extensionCounts;
  }

  if (includeFiles && files.length > 0) {
    node.files = files;
  }

  if (Object.keys(subFolders).length > 0) {
    node.subFolders = subFolders;
  }

  // If the folder is empty and we don't include empty folders, return empty
  if (isEmpty && !includeEmptyFolders) {
    return {};
  }

  // If folder is empty but we should include it, return node with empty object
  if (isEmpty && includeEmptyFolders) {
    if (folder.name) {
      return { [folder.name]: {} };
    }
    return { vault: {} };
  }

  if (folder.name) {
    return { [folder.name]: node };
  }

  return { vault: node };
}

const createGetFileTreeTool = (root: TFolder) =>
  createLangChainTool({
    name: "getFileTree",
    description:
      "Get the file tree as a nested structure of folders and files. By default empty folders are omitted; set fullListing to true to include them.",
    schema: z.object({
      fullListing: z
        .boolean()
        .optional()
        .describe(
          "When true, include empty folders in the result; when false or omitted, empty folders are filtered out"
        ),
    }),
    func: async (args: { fullListing?: boolean }) => {
      const includeEmptyFolders = args?.fullListing === true;
      // First try building the tree with files included
      const tree = buildFileTree(root, true, includeEmptyFolders);

      const prompt = `A JSON represents the file tree as a nested structure:
* The root object has a key "vault" which contains a FileTreeNode object.
* Each FileTreeNode has these properties:
  * files: An array of filenames in the current directory (if any files exist)
  * subFolders: An object mapping folder names to their FileTreeNode objects (if any subfolders exist)
  * extensionCounts: An object with counts of file extensions in this folder and all subfolders

`;
      const jsonResult = JSON.stringify(tree);

      // If the file tree is larger than 0.5MB, use the simplified version instead.
      if (jsonResult.length > 500000) {
        // Rebuild tree without file lists
        const simplifiedTree = buildFileTree(root, false, includeEmptyFolders);
        return prompt + JSON.stringify(simplifiedTree);
      }

      return prompt + jsonResult;
    },
  });

export { createGetFileTreeTool, buildFileTree, type FileTreeNode };
