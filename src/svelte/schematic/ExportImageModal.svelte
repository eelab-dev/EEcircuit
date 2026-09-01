<script lang="ts">
  import Modal from "../components/Modal.svelte";

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

  $effect(() => {
    if (!svgContent) {
      svgUrl = "";
      return;
    }
    const url = URL.createObjectURL(new Blob([svgContent], { type: "image/svg+xml" }));
    svgUrl = url;
    return () => URL.revokeObjectURL(url);
  });

  function downloadSvg() {
    if (!svgContent) return;
    const url = URL.createObjectURL(new Blob([svgContent], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "schematic.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (!svgUrl) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "schematic.png";
        anchor.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = svgUrl;
  }
</script>

<Modal bind:open title="Export Schematic" closeLabel="Close export dialog">
  {#if loading}
    <div class="loading-inline"><span class="spinner"></span><span>Preparing image…</span></div>
  {:else if svgUrl}
    <div class="export-preview"><img src={svgUrl} alt="Schematic export preview" /></div>
    <div class="form-actions"><button onclick={downloadSvg}>Download SVG</button><button class="primary-button" onclick={downloadPng}>Download PNG</button></div>
  {:else}
    <p>Unable to create a schematic preview.</p>
  {/if}
</Modal>
