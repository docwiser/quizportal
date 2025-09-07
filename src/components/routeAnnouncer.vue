<script setup>
import {ref, watch} from "vue";
import {useRoute} from "vue-router";
const route = useRoute();
const getMessageFromPath = (path) => {
const segments = path.split('/');
const lastSegment = segments[segments.length - 1];
return `${lastSegment ? lastSegment.replace(/-/g, ' ').replace(/.html/g, '') : 'Home'} | Saint Josephs Academy Test portal`;
};

const message = ref(getMessageFromPath(route.path));

watch(() => route.path, (newValue) => {
message.value = getMessageFromPath(newValue);
});
</script>

<template>
<p role="alert" aria-live="assertive" aria-atomic="true">{{ message }}</p>
</template>
