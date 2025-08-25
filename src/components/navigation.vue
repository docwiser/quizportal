<script setup>
import {ref, onMounted, nextTick} from "vue";
import {useRouter} from "vue-router";
const router = useRouter();
const props = defineProps({
label: {
type: String,
required: false,
default: 'Toggle Navigation'
},
items: {
type: Array,
required: true,
default: () => ([])
}
});
const isMenuOpen = ref(false);
const focusedIndex = ref(-1);
const toggleButtonRef = ref(null);
const menuRef = ref(null);
const openMenu = () => {
isMenuOpen.value = true;
nextTick(() => {
menuRef.value?.focus();
focusedIndex.value = 0;
document.getElementById(focusedIndex.value)?.focus();
});
};
const closeMenu = () => {
isMenuOpen.value = false;
focusedIndex.value = -1;
toggleButtonRef.value?.focus(); // Return focus to the toggle button
};
const handleKeydown = (event) => {
if (event.key === 'ArrowDown') {
focusedIndex.value = (focusedIndex.value + 1) % props.items.length;
document.getElementById(focusedIndex.value)?.focus();
} else if (event.key === 'ArrowUp') {
focusedIndex.value = (focusedIndex.value - 1 + props.items.length) % props.items.length;
document.getElementById(focusedIndex.value)?.focus();
} else if (event.key === 'Escape') {
closeMenu();
} else if ((event.key === 'Enter' || event.key === ' ') && !props.items[focusedIndex.value].disabled) {
event.preventDefault();
handleMenuSelection(focusedIndex.value);
}
};
const handleMenuSelection = (index) => {
const item = props.items[index];
if (item.disabled) return;
if (item.function) {
item.function();
} else if (item.link) {
if (item.link.startsWith('http')) {
window.location.href = item.link;
} else {
router.push(item.link);
}
}
closeMenu();
};
const handleClickOutside = (event) => {
if (!menuRef.value?.contains(event.target) && !toggleButtonRef.value?.contains(event.target)) {
closeMenu();
}
};
onMounted(() => {
// document.addEventListener('click', handleClickOutside);
});
</script>
<template>
<div>
<button ref="toggleButtonRef" @click="isMenuOpen ? closeMenu() : openMenu()" :aria-expanded="isMenuOpen" aria-haspopup="true" aria-controls="navigation-menu" id="menu-toggler">{{props.label}}</button>
<ul v-if="isMenuOpen" ref="menuRef" role="menu" tabindex="-1" id="navigation-menu" aria-labelledby="menu-toggler" @keydown="handleKeydown">
<li v-for="(item, index) in props.items" :key="item.label" :class="{ focused: focusedIndex === index, disabled: item.disabled }" :id="index" @click="!item.disabled && handleMenuSelection(index)" :tabindex="focusedIndex === index ? 0 : -1" role="menuitem" :aria-disabled="item.disabled">{{ item.label }}</li>
</ul>
</div>
</template>
<style scoped>
/* Basic styling */
ul {
list-style: none;
padding: 0;
}

li {
margin: 5px 0;
}

button {
margin-bottom: 10px;
}

/* Focused item styling */
.focused {
background-color: #dcdcdc;
}

/* Disabled item styling */
.disabled {
color: #999;
pointer-events: none;
cursor: not-allowed;
}
</style>
