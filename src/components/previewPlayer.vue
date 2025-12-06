<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
const props = defineProps({
src: { type: String, required: true },
label: { type: String, required: true }
});
const audio = ref(null);
const playing = ref(false);
const loadedMetadata = ref(false);
const loadMetadata = () => {
loadedMetadata.value = true;
};
const endAudio = () => {
playing.value = false;
};
const playpause = () => {
if (!audio.value) return;
if (audio.value.paused) {
audio.value.play();
playing.value = true;
} else {
audio.value.pause();
playing.value = false;
}
};
onMounted(() => {
audio.value = new Audio(props.src);
audio.value.addEventListener("loadedmetadata", loadMetadata);
audio.value.addEventListener("ended", endAudio);
});
onUnmounted(() => {
if (audio.value) {
audio.value.removeEventListener("loadedmetadata", loadMetadata);
audio.value.removeEventListener("ended", endAudio);
audio.value.pause();
audio.value = null;
}
});
watch(() => props.src, (newSrc) => {
if (audio.value) {
audio.value.pause();
audio.value.src = newSrc;
audio.value.load();
}
});
</script>
<template>
<button type="button" @click="playpause" :disabled="!loadedMetadata" aria-live="polite">
{{ playing ? 'Pause' : props.label }}
</button>
</template>
