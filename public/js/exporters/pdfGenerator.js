export function exportPdf(state) {
  const popup = window.open("", "_blank");
  if (!popup) return false;
  popup.document.write(`<title>${state.metadata.title}</title><style>body{font-family:Georgia;max-width:760px;margin:50px auto;line-height:1.6}h1{font-size:30px}@media print{body{margin:20mm}}</style><h1>${state.metadata.title}</h1><h2>${state.documentSections[0].heading}</h2><p>${state.documentSections[0].content}</p><p>Stack: ${state.metadata.stack.join(", ")}</p>`);
  popup.document.close(); popup.print(); return true;
}
