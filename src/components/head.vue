<script setup>
import {ref, onMounted, onUnmounted} from "vue";
const config = ref({title: "", meta: []});
const props = defineProps({title: {type: String, required: false, default: "Saint Josephs Academy"}, meta: {type: Array, required: false, default: () => ([])}});
onMounted(() => {
config.value.title = document.title;
config.value.meta = parseMeta();
document.title = `${props.title} | Saint Josephs Academy cloud console`;
updateMeta(props.meta);
});
const parseMeta = () => {
const metas = [];
const metatags = document.querySelectorAll("meta");
Array.from(metatags).forEach((metatag) => {
metas.push({name: metatag.getAttribute("name"), content: metatag.getAttribute("content")});
});
return metas;
}
const updateMeta = (meta) => {
meta.forEach((item) => {
const tag = document.createElement("meta");
tag.setAttribute("name", item.name);
tag.setAttribute("content", item.content);
document.head.appendChild(tag);
});
}
onUnmounted(() => {
document.title = config.value.title;
});
</script>
<template>

</template>