<script lang="ts">
  import { Menu } from "@ark-ui/svelte/menu";
  import { ChevronDown, Download, ZoomIn, ZoomOut } from "@lucide/svelte";
  import type { SimpleSvgElement } from "@danchitnis/svg-to-pdf";
  import Modal from "../components/Modal.svelte";

  const PDF_MULTIPLIER = 4;

  let {
    open = $bindable(),
    svgContent,
    loading,
  }: {
    open: boolean;
    svgContent: string | null;
    loading: boolean;
  } = $props();

  let svgUrl = $state("");
  let isFullScale = $state(false);
  let exportingPdf = $state(false);
  let exportError = $state("");
  let processedSvgContent = $derived(adjustSvgFontSize(svgContent, 0.4));

  function adjustSvgFontSize(svg: string | null, scaleFactor: number) {
    if (!svg) return "";
    try {
      const document = new DOMParser().parseFromString(svg, "image/svg+xml");
      for (const text of document.querySelectorAll("text")) {
        const currentSize = Number.parseFloat(text.getAttribute("font-size") ?? "0");
        if (currentSize > 0) text.setAttribute("font-size", String(currentSize * scaleFactor));
      }
      return new XMLSerializer().serializeToString(document);
    } catch {
      return svg;
    }
  }

  $effect(() => {
    if (!processedSvgContent) {
      svgUrl = "";
      return;
    }
    const url = URL.createObjectURL(new Blob([processedSvgContent], { type: "image/svg+xml" }));
    svgUrl = url;
    return () => URL.revokeObjectURL(url);
  });

  $effect(() => {
    if (open) return;
    isFullScale = false;
    exportError = "";
  });

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadSvg() {
    if (!processedSvgContent) return;
    triggerDownload(new Blob([processedSvgContent], { type: "image/svg+xml" }), "schematic.svg");
  }

  function downloadPng() {
    if (!svgUrl) return;
    exportError = "";
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) {
        exportError = "Unable to prepare the PNG canvas.";
        return;
      }
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, "schematic.png");
        else exportError = "Unable to generate the PNG file.";
      }, "image/png");
    };
    image.onerror = () => { exportError = "Unable to load the schematic preview for PNG export."; };
    image.src = svgUrl;
  }

  function adaptSvgElement(element: Element): SimpleSvgElement {
    const attributes: Record<string, string> = {};
    for (const attribute of element.attributes) attributes[attribute.name] = attribute.value;
    return {
      tagName: element.tagName,
      attributes,
      children: Array.from(element.children, adaptSvgElement),
      textContent: element.textContent,
      getAttribute: (name: string) => element.getAttribute(name),
    };
  }

  async function downloadPdf() {
    if (!processedSvgContent || exportingPdf) return;
    exportingPdf = true;
    exportError = "";
    try {
      const document = new DOMParser().parseFromString(processedSvgContent, "image/svg+xml");
      const root = document.documentElement;
      if (root.tagName.toLowerCase() !== "svg") throw new Error("The exported document does not contain an SVG root.");
      const { convertSvgToPdfFromSimpleStructure } = await import("@danchitnis/svg-to-pdf");
      const pdfBytes = await convertSvgToPdfFromSimpleStructure(adaptSvgElement(root), {
        backgroundColor: "white",
        multiplier: PDF_MULTIPLIER,
      });
      triggerDownload(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), "schematic.pdf");
    } catch (error) {
      exportError = error instanceof Error ? error.message : "Unable to generate the PDF file.";
    } finally {
      exportingPdf = false;
    }
  }
</script>

<Modal bind:open title="Export Schematic" closeLabel="Close export dialog" contentClass="export-modal">
  {#if loading}
    <div class="loading-inline export-loading"><span class="spinner"></span><span>Preparing image…</span></div>
  {:else if svgUrl}
    <div class:full-scale={isFullScale} class="export-preview"><img src={svgUrl} alt="Schematic export preview" /></div>
    {#if exportError}<p class="export-error" role="alert">{exportError}</p>{/if}
  {:else}
    <p>Unable to create a schematic preview.</p>
  {/if}

  {#snippet footer()}
    <div class="export-footer">
      <button disabled={!svgUrl} onclick={() => isFullScale = !isFullScale}>
        {#if isFullScale}<ZoomOut size={16} />Fit to View{:else}<ZoomIn size={16} />1:1 Scale{/if}
      </button>
      <div class="export-footer-actions">
        <button onclick={() => open = false}>Close</button>
        <Menu.Root positioning={{ placement: "top-end" }}>
          <Menu.Trigger class="download-menu-trigger" disabled={!svgUrl || exportingPdf}>
            <Download size={16} />{exportingPdf ? "Preparing PDF…" : "Download"}<ChevronDown size={15} />
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content class="download-menu-content">
              <Menu.Item class="download-menu-item" value="png" onSelect={downloadPng}>Download as PNG</Menu.Item>
              <Menu.Item class="download-menu-item" value="svg" onSelect={downloadSvg}>Download as SVG</Menu.Item>
              <Menu.Item class="download-menu-item" value="pdf" onSelect={() => void downloadPdf()}>Download as PDF</Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </div>
    </div>
  {/snippet}
</Modal>
