export default function generateRoutes(folderName = "components") {
const routes = [];
const routeString = `./../../src/${folderName}/**/*.vue`;
const routeModules = import.meta.glob("/src/components/**/*.vue");
Object.keys(routeModules).forEach((filePath) => {
const path = filePath.replace('/src/components', '').replace('.vue', '').replace('index', '');
const componentName = path.split('/').pop();
routes.push({path, name: componentName, component: routeModules[filePath]});
});
return routes;
}
