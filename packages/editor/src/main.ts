import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import * as BeoEngine from 'beo'

// Expose BeoEngine globally for user scripts
;(window as any).BeoEngine = BeoEngine

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
