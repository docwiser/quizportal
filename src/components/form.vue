<template>
<form :name="formname" @submit.prevent="submitForm">
<template v-for="field in visibleFields" :key="field.name">
<fieldset
v-if="field.type === 'step'"
:aria-labelledby="`${field.name}-legend`"
>
<legend :id="`${field.name}-legend`">
{{ field.label || field.name }}
</legend>
<Form
:schema="field.children"
:formname="field.name"
@submit="$emit('submit', $event)"
@change="$emit('change', $event)"
/>
</fieldset>

<div v-else :class="field.class || 'form-group'">
<label :for="field.name" :aria-label="field.label">
{{ field.label }}

<template v-if="field.type === 'textarea'">
<textarea
v-model="formData[field.name]"
:id="field.name"
:name="field.name"
class="form-control"
v-bind="nativeAttrs(field)"
:aria-invalid="!!errors[field.name]"
@input="validateField(field)"
:placeholder="field.help || ''"
></textarea>
</template>

<template v-else-if="['select', 'listbox'].includes(field.type)">
<select
v-model="formData[field.name]"
:id="field.name"
:name="field.name"
class="form-control"
v-bind="nativeAttrs(field)"
:multiple="field.multiple"
:aria-invalid="!!errors[field.name]"
@change="validateField(field)"
>
<option
key="opt-unselect"
selected
disabled
value=""
>
Choose an option...
</option>
<option
v-for="option in field.options"
:key="option.value"
:value="option.value"
>
{{ option.label }}
</option>
</select>
</template>

<template v-else-if="field.type === 'radio'">
<div
role="radiogroup"
:aria-labelledby="field.name + '-legend'"
>
<legend
:id="field.name + '-legend'"
class="visually-hidden"
>
{{ field.label }}
</legend>
<label
v-for="option in field.options"
:key="option.value"
>
<input
type="radio"
:name="field.name"
:value="option.value"
v-model="formData[field.name]"
@change="validateField(field)"
/>
{{ option.label }}
</label>
</div>
</template>

<template v-else-if="field.type === 'checkbox'">
<fieldset :aria-labelledby="field.name + '-legend'">
<legend
:id="field.name + '-legend'"
class="visually-hidden"
>
{{ field.label }}
</legend>
<label
v-for="option in field.options"
:key="option.value"
>
<input
type="checkbox"
:name="field.name"
:value="option.value"
:checked="formData[field.name].includes(option.value)"
@change="onCheckboxChange(field.name, option.value)"
/>
{{ option.label }}
</label>
</fieldset>
</template>

<template v-else-if="field.type === 'file'">
<input
type="file"
:id="field.name"
:name="field.name"
class="form-control"
:multiple="field.multiple"
:aria-invalid="!!errors[field.name]"
@change="onFileChange(field.name, $event)"
v-bind="nativeAttrs(field)"
/>
</template>

<template v-else-if="field.type === 'multiselectable'">
<select
:id="field.name"
:name="field.name"
class="form-control"
@change="onMultiSelectAdd(field.name, $event)"
:aria-invalid="!!errors[field.name]"
>
<option
key="opt-unselected"
value=""
selected
disabled
>
Choose an option...
</option>
<option
v-for="option in availableOptions(field)"
:key="option.value"
:value="option.value"
>
{{ option.label }}
</option>
</select>
<ul class="multi-selected">
<li
v-for="(val, idx) in formData[field.name]"
:key="val"
>
{{ getLabel(field, val) }}
<button
type="button"
@click="removeMultiSelect(field.name, val)"
aria-label="remove"
>
×
</button>
</li>
</ul>
</template>

<template v-else>
<input
:type="inputType(field)"
v-model="formData[field.name]"
:id="field.name"
:name="field.name"
class="form-control"
v-bind="nativeAttrs(field)"
:aria-invalid="!!errors[field.name]"
@input="validateField(field)"
:placeholder="field.help || ''"
/>
</template>

<div
v-if="errors[field.name]"
class="error"
role="alert"
aria-live="polite"
>
{{ errors[field.name] }}
</div>

<small
v-if="field.help"
:id="field.name + '-help'"
class="form-text"
>
{{ field.help }}
</small>
</label>
</div>
</template>

<div class="form-actions">
<template v-for="field in buttonFields" :key="field.name">
<button
v-if="field.type === 'submit'"
type="submit"
:name="field.name"
class="btn btn-primary"
>
{{ field.value || "Submit" }}
</button>

<button
v-else-if="field.type === 'reset'"
type="reset"
:name="field.name"
class="btn btn-secondary"
@click="resetForm"
>
{{ field.value || "Reset" }}
</button>
</template>
</div>
</form>
</template>

<script setup>
import {
ref,
computed,
reactive
} from "vue";

const props = defineProps({
schema: Array,
formname: String
});

const emit = defineEmits(["submit", "change"]);

const formData = reactive({});
const errors = reactive({});

// hide: submit, reset, hidden
const visibleFields = computed(() =>
props.schema.filter(
(f) => !["submit", "reset", "hidden"].includes(f.type)
)
);

const buttonFields = computed(() =>
props.schema.filter((f) => ["submit", "reset"].includes(f.type))
);

// Initialize formData
props.schema.forEach((field) => {
if (field.type === "submit" || field.type === "reset") {
return;
}

if (field.type === "step") {
formData[field.name] = {};
(field.children || []).forEach((child) => {
formData[field.name][child.name] =
child.value ?? (child.type === "checkbox" ? [] : "");
});
} else {
if (field.type === "checkbox") {
formData[field.name] = field.value ?? [];
} else if (field.type === "file") {
formData[field.name] = null;
} else if (field.type === "multiselectable") {
formData[field.name] = field.value ?? [];
} else if (field.type === "hidden") {
// Hidden fields: just store the value, no UI
formData[field.name] = field.value ?? "";
} else {
formData[field.name] = field.value ?? "";
}
}
});

function nativeAttrs(field) {
const attrs = {};
if (field.required) attrs.required = true;
if (field.min != null) attrs.min = field.min;
if (field.max != null) attrs.max = field.max;
if (field.step != null) attrs.step = field.step;
if (field.pattern) attrs.pattern = field.pattern;
return attrs;
}

function inputType(field) {
if (field.type === "datetime") return "datetime-local";
if (!field.type) return "text";
return field.type;
}

function validateField(field) {
// hidden fields are never user-editable: skip validation
if (field.type === "hidden") {
errors[field.name] = "";
return;
}

const value = formData[field.name];
let error = "";

if (
field.required &&
(!value || (Array.isArray(value) && !value.length))
) {
error = "This field is required.";
}

if (
value != null &&
value !== "" &&
(field.min != null || field.max != null) &&
(field.type === "number" || field.type === "range")
) {
const numeric = Number(value);
if (!Number.isNaN(numeric)) {
if (field.min != null && numeric < field.min) {
error = `Minimum value is ${field.min}.`;
}
if (field.max != null && numeric > field.max) {
error = `Maximum value is ${field.max}.`;
}
}
}

if (field.pattern && value) {
const re = new RegExp(field.pattern);
if (!re.test(value)) {
error = "Invalid format.";
}
}

errors[field.name] = error;
}

function submitForm() {
props.schema.forEach((field) => validateField(field));
const hasErrors = Object.values(errors).some((e) => e);
if (!hasErrors) {
emit("submit", JSON.parse(JSON.stringify(formData)));
}
}

function resetForm() {
props.schema.forEach((field) => {
if (field.type === "step") {
(field.children || []).forEach((child) => {
formData[field.name][child.name] =
child.type === "checkbox" ? [] : "";
});
} else if (field.type === "checkbox") {
formData[field.name] = [];
} else if (field.type === "file") {
formData[field.name] = null;
} else if (field.type === "multiselectable") {
formData[field.name] = [];
} else if (field.type === "hidden") {
// Reset to original hidden value
formData[field.name] = field.value ?? "";
} else {
formData[field.name] = "";
}
errors[field.name] = "";
});
}

function onCheckboxChange(name, value) {
const list = formData[name];
const index = list.indexOf(value);
if (index > -1) list.splice(index, 1);
else list.push(value);
emit("change", { name, newValue: [...list] });
}

function onFileChange(name, event) {
formData[name] =
event.target.files.length > 1
? [...event.target.files]
: event.target.files[0];
emit("change", { name, newValue: formData[name] });
}

function onMultiSelectAdd(name, event) {
const value = event.target.value;
if (value && !formData[name].includes(value)) {
formData[name].push(value);
emit("change", { name, newValue: [...formData[name]] });
}
event.target.selectedIndex = 0;
}

function removeMultiSelect(name, value) {
formData[name] = formData[name].filter((v) => v !== value);
emit("change", { name, newValue: [...formData[name]] });
}

function availableOptions(field) {
return field.options.filter(
(o) => !formData[field.name].includes(o.value)
);
}

function getLabel(field, value) {
return field.options.find((o) => o.value === value)?.label || value;
}
</script>

<style scoped>
.visually-hidden {
position: absolute !important;
height: 1px;
width: 1px;
overflow: hidden;
clip: rect(1px, 1px, 1px, 1px);
white-space: nowrap;
}
.error {
color: red;
font-size: 0.9rem;
margin-top: 4px;
}
.multi-selected {
list-style: none;
padding-left: 0;
margin-top: 0.5rem;
}
.multi-selected li {
display: flex;
align-items: center;
gap: 0.5rem;
}
.multi-selected button {
background: transparent;
border: none;
cursor: pointer;
color: red;
}
.form-actions {
margin-top: 1rem;
display: flex;
gap: 1rem;
}
</style>
