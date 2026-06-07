import type { FlashChunk } from "../../domain/reading";
import "./FlashChunksRenderer.css";

type FlashChunksRendererProps = {
  chunk: FlashChunk | undefined;
};

function FlashChunksRenderer({ chunk }: FlashChunksRendererProps) {
  return (
    <section
      className="flash-chunks-renderer"
      aria-label="Flash chunks"
      data-flash-chunks-renderer="true"
      data-flash-chunk-index-range={
        chunk === undefined
          ? "none"
          : `${chunk.firstWordIndex}-${chunk.lastWordIndex}`
      }
    >
      <p className="flash-chunks-text" data-flash-chunk-text>
        {chunk?.text ?? ""}
      </p>
    </section>
  );
}

export default FlashChunksRenderer;
