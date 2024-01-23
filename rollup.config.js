import terser from '@rollup/plugin-terser'
// plugin-node-resolve and plugin-commonjs are required for a rollup bundled project
// to resolve dependencies from node_modules. See the documentation for these plugins
// for more details.
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import json from "@rollup/plugin-json"

const nodeEnvironment = process.env.NODE_ENV

export default {
  input: "index.ts",
  output: {
    exports: "named",
    format: "es",
    file: "dist/_worker.js",
    sourcemap: true,
		sourcemapPathTransform: relativeSourcePath => 
			relativeSourcePath.replace(/^(\.\.\/)(?=node_modules)/, "../").replace(/^(\.\.\/)+(?!node_modules)/, "../"),
  },
  plugins: [commonjs(), nodeResolve({ browser: true }), typescript({ resolveJsonModule: true }), json(), ...(nodeEnvironment == "production" ? [terser()] : [])],
	watch: {
		clearScreen: false,
	},
	onwarn: warning => {
		if ( warning.code !== 'THIS_IS_UNDEFINED' )
			console.warn( warning.message );
	},
}


