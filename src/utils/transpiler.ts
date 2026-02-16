import * as Babel from '@babel/standalone';

export interface TranspileResult {
    code: string;
    componentName: string;
}

export interface TranspileError {
    error: string;
}

/**
 * **ERROR-FREE TRANSPILER** - Runs in parent window, not inside iframe string interpolation hell
 * Handles all code transformation: import stripping, global mapping, and Babel transpilation
 */
export const transpileCode = (rawCode: string): TranspileResult | TranspileError => {
    try {
        if (!rawCode || rawCode.length < 10) {
            return { code: '', componentName: 'App' };
        }

        // 1. Strip and map imports to globals (Template/Existing code support)
        let processedCode = rawCode;

        // Map React imports to global React (destructure hooks)
        processedCode = processedCode.replace(/import\s+[\s\S]*?from\s+['"]react['"];?/g, (match) => {
            const hooks = match.match(/{(.*)}/);
            return hooks ? `const {${hooks[1]}} = React;` : '';
        });

        // Map Lucide imports to global LucideReact (unified name)
        processedCode = processedCode.replace(/import\s+[\s\S]*?from\s+['"]lucide-react['"];?/g, (match) => {
            const icons = match.match(/{([\s\S]*)}/);
            return icons ? `const {${icons[1]}} = LucideReact;` : '';
        });

        // Also handle the AI's new 'lucide.IconName' format by mapping it to LucideReact
        processedCode = processedCode.replace(/lucide\.([A-Z][a-zA-Z0-9_]*)/g, 'LucideReact.$1');

        // Strip ALL remaining imports
        processedCode = processedCode.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');

        // 2. Capture component name
        // Try 'export default Name' first, then 'const Name =', then fallback to 'App'
        const exportMatch = processedCode.match(/export default\s+([a-zA-Z0-9_$]+)/);
        const constMatch = [...processedCode.matchAll(/const\s+([A-Z][a-zA-Z0-9_$]*)\s*=/g)].pop();
        const componentName = exportMatch ? exportMatch[1] : (constMatch ? constMatch[1] : 'App');

        // Clean up ESM keywords
        processedCode = processedCode.replace(/export default\s+[a-zA-Z0-9_$]+;?/g, '');
        processedCode = processedCode.replace(/export\s+/g, '');

        // 3. Transpile TypeScript + JSX to clean JS
        const result = Babel.transform(processedCode, {
            presets: ['react', 'typescript'],
            filename: 'generated.tsx'
        });

        // 3. Expose component to global scope for iframe access
        const globalizedCode = `${result.code || ''}\nwindow.${componentName} = ${componentName};`;

        return {
            code: globalizedCode,
            componentName
        };
    } catch (err: any) {
        console.error('Transpilation error:', err);
        return { error: `${err.name}: ${err.message}` };
    }
};
