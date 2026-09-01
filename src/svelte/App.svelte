<script lang="ts">
  import Logo from "./components/Logo.svelte";
</script>

<svelte:head><title>EEcircuit</title></svelte:head>

<main class="app-shell">
  <header class="app-header">
    <Logo />
    <div>
      <h1>EEcircuit</h1>
      <p>Svelte migration runtime</p>
    </div>
  </header>
  <section class="loading-panel" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <p>Preparing circuit editor…</p>
  </section>
</main>
