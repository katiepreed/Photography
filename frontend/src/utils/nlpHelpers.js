import nlp from "compromise";

export const getMainSubject = (caption) => {
  const doc = nlp(caption);
  const nouns = doc.nouns().out("array");

  // Heuristic: Return last noun as it's often the most specific
  return nouns.length ? nouns[nouns.length - 1] : "unknown";
};
