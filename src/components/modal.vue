<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
const props = defineProps({
title: { type: String, default: "Dialog" },
closeLabel: { type: String, default: "Close" },
showButton: { type: Boolean, default: false },
buttonLabel: { type: String, default: "Open Modal" },
open: { type: Boolean, default: false },
});
const emit = defineEmits(["modalOpened", "modalClosed", "modalUpdated"]);
const modalRef = ref(null);
const modalOpen = ref(props.open);
watch(modalOpen, (value) => {
if (!modalRef.value) return;
if (value) {
if (!modalRef.value.open) modalRef.value.showModal();
} else {
if (modalRef.value.open) modalRef.value.close();
}
});
watch(() => props.open, (newValue) => {
setTimeout(() => {
modalOpen.value = newValue;
}, 450);
});
onMounted(() => {
emit("modalUpdated", {
openModal,
closeModal
});
});
function openModal() {
modalOpen.value = true;
emit("modalOpened");
}
function closeModal() {
modalOpen.value = false;
emit("modalClosed");
}
defineExpose({
openModal,
closeModal,
});
</script>
<template>
<div>
<button type="button" v-if="showButton" @click="openModal">{{props.buttonLabel}}</button>
<dialog ref="modalRef" :aria-label="props.title" role="dialog" aria-modal="true">
<h2>{{props.title}}</h2>
<button type="button" @click="closeModal">{{props.closeLabel}}</button>
<div>
<slot />
</div>
</dialog>
</div>
</template>
