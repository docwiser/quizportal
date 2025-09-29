<script setup>
import {onMounted} from "vue";
import {RouterLink} from "vue-router";
onMounted(() => {
document.title = "404: page not Found | Saint Josephs Academy";
});
</script>
<template>
<h1>404: page not found</h1>
<p>Sorry, this page does not exists on this server</p>
<p>Please double-check the URL and try again</p>
<RouterLink role="button" to="/">Take me home</RouterLink>
</template>