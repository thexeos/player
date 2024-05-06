import type { MediaContext, MediaSrc, MediaType } from '../../core';
import { isHLSSrc, WHEP_TYPES } from '../../utils/mime';
import { preconnect } from '../../utils/network';
import { isHLSSupported } from '../../utils/support';
import type { MediaProviderLoader } from '../types';
import { VideoProviderLoader } from '../video/loader';
import type { WHEPProvider } from './provider';

export class WHEPProviderLoader implements MediaProviderLoader<WHEPProvider> {
  target!: HTMLVideoElement;

  canPlay(src: MediaSrc) {
    return WHEP_TYPES.has(src.type);
  }

  mediaType({ type }: MediaSrc): MediaType {
    return type === 'audio/x-whep' ? 'audio' : 'video';
  }

  async load(context: MediaContext) {
    if (__SERVER__) {
      throw Error('[vidstack] can not load whep provider server-side');
    }

    if (__DEV__ && !this.target) {
      throw Error(
        '[vidstack] `<video>` element was not found - did you forget to include `<media-provider>`?',
      );
    }

    return new (await import('./provider')).WHEPProvider(this.target, context);
  }
}
