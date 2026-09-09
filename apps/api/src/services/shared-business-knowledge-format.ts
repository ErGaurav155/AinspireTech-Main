export const SHARED_KNOWLEDGE_ARCHIVE_HEADING =
  "=== NORMALIZED SOURCE ARCHIVE ===";

export const getRuntimeSharedKnowledge = (artifact: string) => {
  const archiveIndex = artifact.indexOf(SHARED_KNOWLEDGE_ARCHIVE_HEADING);
  return (archiveIndex >= 0 ? artifact.slice(0, archiveIndex) : artifact).trim();
};

export const getSharedKnowledgeSourceArchive = (artifact: string) => {
  const archiveIndex = artifact.indexOf(SHARED_KNOWLEDGE_ARCHIVE_HEADING);
  if (archiveIndex < 0) return artifact.trim();
  return artifact
    .slice(archiveIndex + SHARED_KNOWLEDGE_ARCHIVE_HEADING.length)
    .trim();
};

export const createSharedKnowledgeArtifact = ({
  runtimeKnowledge,
  sourceArchive,
}: {
  runtimeKnowledge: string;
  sourceArchive: string;
}) =>
  `${runtimeKnowledge.trim()}\n\n${SHARED_KNOWLEDGE_ARCHIVE_HEADING}\n${sourceArchive.trim()}`;
