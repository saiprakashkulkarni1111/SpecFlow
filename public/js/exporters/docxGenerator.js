export function exportDocx(state) {
  const text = `${state.metadata.title}\n\n${state.documentSections.map((section) => `${section.heading}\n${section.content}`).join("\n\n")}\n\nStack: ${state.metadata.stack.join(", ")}`;
  const blob = new Blob([text], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "telemetry-pipeline.docx"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500);
}
