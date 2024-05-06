import { peek } from 'maverick.js';
import { isString } from 'maverick.js/std';

import type { MediaSrc } from '../../core/api/types';
import type { MediaProviderAdapter, MediaSetupContext } from '../types';
import { VideoProvider } from '../video/provider';
import { WHEPClient } from './whep-client';

/**
 * The WHEP provider introduces support for WHEP streaming that uses native WebRTC to stream low-latency
 * media. WHEP is [supported natively](https://caniuse.com/?search=webrtc) on all evergreen browsers.
 * Note: if you have platform-supplied Bearer token, check the documentation for how to pass it.
 *
 * @docs {@link https://www.vidstack.io/docs/player/providers/whep}
 * @see {@link https://datatracker.ietf.org/doc/draft-murillo-whep/}
 * @example
 * ```html
 * <media-player
 *   src={ src: "<WHEP endpoint>", type: "application/x-whep" }
 *   poster="https://media-files.vidstack.io/poster.png"
 * >
 *   <media-provider></media-provider>
 * </media-player>
 * ```
 */
export class WHEPProvider extends VideoProvider implements MediaProviderAdapter {
  protected override $$PROVIDER_TYPE = 'HLS';

  private readonly _controller = new WHEPClient(this.video);

  override get type() {
    return 'whep';
  }

  /**
   * The `WHEPClient` configuration object.
   *
   * @see {@link https://www.vidstack.io/docs/player/providers/whep#options}
   */
  get config() {
    return this._controller._config;
  }

  set config(config) {
    this._controller._config = config;
  }

  override setup(context: MediaSetupContext) {
    super.setup(context);
    this._controller.setup(context);
    context.delegate._dispatch('provider-setup', { detail: this });
    const src = peek(context.$state.source);
    if (src) this.loadSource(src);
  }

  override async loadSource(src: MediaSrc, preload?: HTMLMediaElement['preload']) {
    if (!isString(src.src)) return;
    this._controller.load(src, preload);
    this._currentSrc = src;
  }

  destroy() {
    this._controller._destroy();
  }
}
