import * as FileSystem from 'expo-file-system/legacy';

/**
 * Stored file URIs are absolute, but iOS may move the app's data container on an app update
 * (new path, same files). Re-anchors a URI from an older container in the current document
 * directory; other URIs are returned unchanged.
 */
export function resolveAppFileUri(
  uri: string,
  documentDirectory: string | null = FileSystem.documentDirectory
): string {
  if (!documentDirectory || !uri.startsWith('file://') || uri.startsWith(documentDirectory)) return uri;
  // 'Documents' on iOS, 'files' on Android
  const folder = documentDirectory.split('/').filter(Boolean).pop();
  const marker = `/${folder}/`;
  const index = uri.lastIndexOf(marker);
  return index < 0 ? uri : documentDirectory + uri.slice(index + marker.length);
}
