import {reactive} from "vue";
const toast = reactive([]);
export const useToast = () => {
const addToast = (message, type="info", duration=15000) => {
toast.push({message, type});
setTimeout(() => removeToast(toast.length-1), duration);
};
const removeToast = (index) => {
toast.splice(index, 1);
};
return {toast, addToast, removeToast};
};
