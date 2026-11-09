import type { Block, InlineNode } from "@/shared/lib/markdown";

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "strong") return <strong key={index}>{node.text}</strong>;
        if (node.type === "em") return <em key={index}>{node.text}</em>;
        if (node.type === "link") {
          const external = /^https?:/i.test(node.href);
          return (
            <a
              key={index}
              href={node.href}
              className="text-primary underline"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {node.text}
            </a>
          );
        }
        return <span key={index}>{node.text}</span>;
      })}
    </>
  );
}

export function GuideBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[17px] leading-8 text-foreground/90">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={index} className="pt-4 font-serif text-2xl font-bold tracking-tight text-ink">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="pt-2 font-serif text-xl font-bold tracking-tight text-ink">
                {block.text}
              </h3>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground"
              >
                <Inline nodes={block.inline} />
              </blockquote>
            );
          case "ul":
          case "ol": {
            const List = block.type;
            return (
              <List
                key={index}
                className={`space-y-1.5 pl-6 ${block.type === "ul" ? "list-disc" : "list-decimal"}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline nodes={item} />
                  </li>
                ))}
              </List>
            );
          }
          default:
            return (
              <p key={index}>
                <Inline nodes={block.inline} />
              </p>
            );
        }
      })}
    </div>
  );
}
