import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import multi from '@rollup/plugin-multi-entry';
import pkg from './package.json';

export default [
    // browser-friendly UMD build
    {
        input: 'src/*.js',
        external: ['eventbus', 'rxjs'],
        output: {
            file: pkg.module,
            format: 'es',
            sourcemap: 'inline'
        },
        plugins: [
            resolve(), // so Rollup can find `ms`
            commonjs(), // so Rollup can convert `ms` to an ES module
            multi()
        ]
    }
];