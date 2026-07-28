import Link from "next/link";

type AiSearchAnswerProps = {
  answer: string;
  citationIndexes: number[];
};

export function AiSearchAnswer({ answer, citationIndexes }: AiSearchAnswerProps) {
  const available = new Set(citationIndexes);

  return (
    <p className="ai-answer-copy">
      {answer.split(/(\[\d+\])/g).map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        const citationIndex = match ? Number(match[1]) : null;

        return citationIndex && available.has(citationIndex) ? (
          <Link
            aria-label={`View source ${citationIndex}`}
            className="ai-inline-citation"
            href={`#source-${citationIndex}`}
            key={`${part}-${index}`}
          >
            {citationIndex}
          </Link>
        ) : (
          part
        );
      })}
    </p>
  );
}
