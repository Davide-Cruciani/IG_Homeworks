export async function readConfigs(path) {
    const response = await fetch(path);
    if (!response.ok) {
        console.error('Error: '+response.status);
        throw new Error(`Failed to load config at ${path}: ${response.statusText}`);
    }
    return await response.json();
}
