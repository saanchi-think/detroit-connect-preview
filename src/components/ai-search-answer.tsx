import Link from "next/link";

export type AiSearchProfileLink = {
  id: string;
  name: string;
  href: string;
};

type AiSearchAnswerProps = {
  answer: string;
  profiles?: AiSearchProfileLink[];
};

export function cleanAiDisplayText(value: string) {
  return value
    .replace(/\s*\[\d+(?:\s*[-–,]\s*\d+)*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type AnswerBlock =
  | { type: "paragraph"; text: string }
  | { type: "ordered" | "unordered"; items: Array<{ depth: number; text: string }> };

function cleanAnswerLine(value: string) {
  return value
    .replace(/\s*\[\d+(?:\s*[-–,]\s*\d+)*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function readAnswerBlocks(answer: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    const text = cleanAnswerLine(paragraphLines.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraphLines = [];
  }

  for (const rawLine of answer.split(/\r?\n/)) {
    if (!rawLine.trim()) {
      flushParagraph();
      continue;
    }

    const itemMatch = rawLine.match(/^(\s*)(?:(\d+)[.)]|[-*•])\s+(.+)$/);
    if (!itemMatch) {
      const previous = blocks.at(-1);
      if (previous?.type === "ordered" || previous?.type === "unordered") {
        const lastItem = previous.items.at(-1);
        if (lastItem) {
          lastItem.text = cleanAnswerLine(`${lastItem.text} ${rawLine}`);
          continue;
        }
      }
      paragraphLines.push(rawLine);
      continue;
    }

    flushParagraph();
    const type = itemMatch[2] ? "ordered" : "unordered";
    const text = cleanAnswerLine(itemMatch[3]);
    if (!text) continue;
    const depth = Math.min(Math.floor(itemMatch[1].replace(/\t/g, "  ").length / 2), 2);
    const previous = blocks.at(-1);

    if (previous?.type === type) {
      previous.items.push({ depth, text });
    } else {
      blocks.push({ type, items: [{ depth, text }] });
    }
  }

  flushParagraph();
  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: cleanAiDisplayText(answer) }];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function AiSearchInlineText({
  value,
  profiles = [],
}: {
  value: string;
  profiles?: AiSearchProfileLink[];
}) {
  const byName = new Map<string, AiSearchProfileLink>();
  profiles.forEach((profile) => {
    const name = profile.name.trim();
    if (name) byName.set(name.toLowerCase(), { ...profile, name });
  });
  const names = Array.from(byName.values())
    .map((profile) => profile.name)
    .sort((left, right) => right.length - left.length);

  if (names.length === 0) return value;

  const pieces = value.split(new RegExp(`(${names.map(escapeRegExp).join("|")})`, "gi"));
  return pieces.map((piece, index) => {
    const profile = byName.get(piece.toLowerCase());
    if (!profile) return piece;
    return (
      <Link className="ai-answer-profile-link" href={profile.href} key={`${profile.id}-${index}`}>
        {piece}
      </Link>
    );
  });
}

export function AiSearchAnswer({ answer, profiles = [] }: AiSearchAnswerProps) {
  return (
    <div className="ai-answer-copy">
      {readAnswerBlocks(answer).map((block, blockIndex) => {
        if (block.type === "paragraph") {
          return (
            <p key={`paragraph-${blockIndex}`}>
              <AiSearchInlineText profiles={profiles} value={block.text} />
            </p>
          );
        }

        const List = block.type === "ordered" ? "ol" : "ul";
        return (
          <List className={`ai-answer-list ${block.type}`} key={`${block.type}-${blockIndex}`}>
            {block.items.map((item, itemIndex) => (
              <li className={`ai-answer-list-item depth-${item.depth}`} key={`${item.text}-${itemIndex}`}>
                <AiSearchInlineText profiles={profiles} value={item.text} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
