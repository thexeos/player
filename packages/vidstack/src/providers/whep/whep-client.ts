import { EventEmitter } from 'events';

// import { DOMEvent, listenEvent } from 'maverick.js/std';

import type { MediaSrc } from '../..';
import { QualitySymbol } from '../../core/quality/symbols';
// import { ListSymbol } from '../../foundation/list/symbols';
import type { MediaSetupContext } from '../types';

const RECONNECT_ATTEMPTS = 2;

interface WEHPClientConfig {
  /**
   * Token supplied by WHEP provider which is used for authorization.
   */
  bearer?: string;
  /**
   * List of STUN/TURN servers. By default, free Google STUN server is used.
   */
  iceServers?: RTCIceServer[];
}

export class WHEPClient extends EventEmitter {
  private _ctx!: MediaSetupContext;

  // private videoElement: HTMLVideoElement;
  private peer: RTCPeerConnection = <RTCPeerConnection>{};
  // private adapterType: string;
  // private adapterFactory: AdapterFactoryFunction | undefined = undefined;
  // private iceServers: RTCIceServer[];
  // private debug: boolean;
  private channelUrl: URL = <URL>{};
  private reconnectAttemptsLeft: number = RECONNECT_ATTEMPTS;
  // private csaiManager?: CSAIManager;
  private adapter: Adapter = <Adapter>{};
  private statsInterval: ReturnType<typeof setInterval> | undefined;
  private statsTypeFilter: string | undefined = undefined;
  private msStatsInterval = 5000;
  private mediaTimeoutOccured = false;
  private mediaTimeoutThreshold = 30000;
  private timeoutThresholdCounter = 0;
  private bytesReceived = 0;
  private mediaConstraints: MediaConstraints;

  _config: WEHPClientConfig = {};

  _iceServers: RTCIceServer[];

  _audioOnly: boolean = false;
  _currentEndpoint: string | null = null;

  constructor(private _video: HTMLVideoElement) {
    super();

    this.mediaConstraints = {
      audioOnly: false,
      videoOnly: false,
    };

    // this._config = {};
    this._iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  setup(context: MediaSetupContext) {
    this._ctx = context;

    // this._instance.on(ctor.Events.ERROR, this._onError.bind(this));

    // this._instance.attachMedia(this._video);
    // this._instance.on(ctor.Events.LEVEL_SWITCHED, this._onLevelSwitched.bind(this));
    // this._instance.on(ctor.Events.LEVEL_LOADED, this._onLevelLoaded.bind(this));

    // context.qualities[QualitySymbol._enableAuto] = this._enableAutoQuality.bind(this);

    // listenEvent(context.qualities, 'change', this._onQualityChange.bind(this));
    // listenEvent(context.audioTracks, 'change', this._onAudioChange.bind(this));

    // this._stopLiveSync = effect(this._liveSync.bind(this));
  }

  load({ src, type }: MediaSrc, preload?: HTMLMediaElement['preload']) {
    if (typeof src !== 'string') return;

    this.mediaConstraints.audioOnly = type.startsWith('audio/');

    this._currentEndpoint = src;

    this.connect();
  }

  // private _connect() {
  //   // Terdown if already connected
  //   // Setup new
  // }

  // private peer: RTCPeerConnection = <RTCPeerConnection>{};
  // private reconnectAttemptsLeft: number = RECONNECT_ATTEMPTS;

  private async onConnectionStateChange() {
    if (this.peer.connectionState === 'failed') {
      // this.emit(Message.PEER_CONNECTION_FAILED);
      this.peer && this.peer.close();

      if (this.reconnectAttemptsLeft <= 0) {
        // this.error('Connection failed, reconnecting failed');
        return;
      }

      // this.log(
      //   `Connection failed, recreating peer connection, attempts left ${this.reconnectAttemptsLeft}`
      // );
      await this.connect();
      this.reconnectAttemptsLeft--;
    } else if (this.peer.connectionState === 'connected') {
      // this.log('Connected');
      this.reconnectAttemptsLeft = RECONNECT_ATTEMPTS;
    }
  }

  private onErrorHandler(error: string) {
    // this.log(`onError=${error}`);
    switch (error) {
      case 'reconnectneeded':
        this.peer && this.peer.close();
        this._video.srcObject = null;
        this.setupPeer();
        this.adapter.resetPeer(this.peer);
        this.adapter.connect();
        break;
      case 'connectionfailed':
        this.peer && this.peer.close();
        this._video.srcObject = null;
        // this.emit(Message.INITIAL_CONNECTION_FAILED);
        break;
    }
  }

  private async onConnectionStats() {
    if (this.peer && this.statsTypeFilter) {
      let bytesReceivedBlock = 0;
      const stats = await this.peer.getStats(null);

      stats.forEach((report) => {
        if (report.type.match(this.statsTypeFilter)) {
          // this.emit(`stats:${report.type}`, report);
        }

        //inbound-rtp attribute bytesReceived from stats report will contain the total number of bytes received for this SSRC.
        //In this case there are several SSRCs. They are all added together in each onConnectionStats iteration and compared to their value during the previous iteration.
        if (report.type.match('inbound-rtp')) {
          bytesReceivedBlock += report.bytesReceived;
        }
      });

      if (bytesReceivedBlock <= this.bytesReceived) {
        this.timeoutThresholdCounter += this.msStatsInterval;

        if (
          this.mediaTimeoutOccured === false &&
          this.timeoutThresholdCounter >= this.mediaTimeoutThreshold
        ) {
          // this.emit(Message.NO_MEDIA);
          this.mediaTimeoutOccured = true;
        }
      } else {
        this.bytesReceived = bytesReceivedBlock;
        this.timeoutThresholdCounter = 0;

        if (this.mediaTimeoutOccured == true) {
          // this.emit(Message.MEDIA_RECOVERED);
          this.mediaTimeoutOccured = false;
        }
      }
    }
  }

  private setupPeer() {
    this.peer = new RTCPeerConnection({ iceServers: this._iceServers });
    this.peer.onconnectionstatechange = this.onConnectionStateChange.bind(this);
    this.peer.ontrack = this.onTrack.bind(this);
  }

  private onTrack(event: RTCTrackEvent) {
    for (const stream of event.streams) {
      if (stream.id === 'feedbackvideomslabel') {
        continue;
      }

      console.log(
        'Set video element remote stream to ' + stream.id,
        ' audio ' + stream.getAudioTracks().length + ' video ' + stream.getVideoTracks().length,
      );

      // Create a new MediaStream if we don't have one
      if (!this._video.srcObject) {
        this._video.srcObject = new MediaStream();
      }

      // We might have one stream of both audio and video, or separate streams for audio and video
      for (const track of stream.getTracks()) {
        (this._video.srcObject as MediaStream).addTrack(track);
      }
    }
  }

  private async connect() {
    this.setupPeer();

    this.adapter = new WHEPAdapter(
      this.peer,
      this.channelUrl,
      this.onErrorHandler.bind(this),
      this.mediaConstraints,
    );

    // if (this.debug) {
    this.adapter.enableDebug();
    // }

    this.statsInterval = setInterval(this.onConnectionStats.bind(this), this.msStatsInterval);

    try {
      await this.adapter.connect();
    } catch (error) {
      console.error(error);
      this.stop();
    }
  }

  mute() {
    this._video.muted = true;
  }

  unmute() {
    this._video.muted = false;
  }

  async unload() {
    await this.adapter.disconnect();
    this.stop();
  }

  stop() {
    clearInterval(this.statsInterval);
    this.peer.close();
    this._video.srcObject = null;
    this._video.load();
  }

  destroy() {
    this.stop();
    this.removeAllListeners();
  }

  // private _onLevelSwitched(eventType: string, data: HLS.LevelSwitchedData) {
  //   const quality = this._ctx.qualities[data.level];
  //   if (quality) {
  //     this._ctx.qualities[ListSymbol._select](
  //       quality,
  //       true,
  //       new DOMEvent(eventType, { detail: data }),
  //     );
  //   }
  // }

  // private _onLevelLoaded(eventType: string, data: HLS.LevelLoadedData): void {
  //   if (this._ctx.$state.canPlay()) return;

  //   const { totalduration: duration } = data.details;
  //   const event = new DOMEvent(eventType, { detail: data });

  //   this._ctx.delegate._dispatch('stream-type-change', {
  //     detail: 'll-live',
  //     trigger: event,
  //   });

  //   this._ctx.delegate._dispatch('duration-change', { detail: duration, trigger: event });

  //   const media = this._instance!.media!;

  //   if (this._instance!.currentLevel === -1) {
  //     this._ctx.qualities[QualitySymbol._setAuto](true, event);
  //   }

  //   for (const track of this._instance!.audioTracks) {
  //     this._ctx.audioTracks[ListSymbol._add](
  //       {
  //         id: track.id + '',
  //         label: track.name,
  //         language: track.lang || '',
  //         kind: 'main',
  //       },
  //       event,
  //     );
  //   }

  //   for (const level of this._instance!.levels) {
  //     this._ctx.qualities[ListSymbol._add](
  //       {
  //         width: level.width,
  //         height: level.height,
  //         codec: level.codecSet,
  //         bitrate: level.bitrate,
  //       },
  //       event,
  //     );
  //   }

  //   media.dispatchEvent(new DOMEvent<void>('canplay', { trigger: event }));
  // }

  // private _onError(eventType: string, data: HLS.ErrorData) {
  //   if (__DEV__) {
  //     this._ctx.logger
  //       ?.errorGroup(`HLS error \`${eventType}\``)
  //       .labelledLog('Media Element', this._instance?.media)
  //       .labelledLog('HLS Instance', this._instance)
  //       .labelledLog('Event Type', eventType)
  //       .labelledLog('Data', data)
  //       .labelledLog('Src', peek(this._ctx.$state.source))
  //       .labelledLog('Media Store', { ...this._ctx.$state })
  //       .dispatch();
  //   }

  //   if (data.fatal) {
  //     switch (data.type) {
  //       case 'networkError':
  //         this._instance?.startLoad();
  //         break;
  //       case 'mediaError':
  //         this._instance?.recoverMediaError();
  //         break;
  //       default:
  //         // We can't recover here - better course of action?
  //         this._instance?.destroy();
  //         this._instance = null;
  //         break;
  //     }
  //   }
  // }

  _destroy() {
    if (this._ctx) this._ctx.qualities[QualitySymbol._enableAuto] = undefined;
    // this._instance?.destroy();
    // this._instance = null;
    if (__DEV__) this._ctx?.logger?.info('🏗️ Destroyed WEHP instance');
  }
}

interface AdapterConnectOptions {
  timeout: number;
}

interface Adapter {
  enableDebug(): void;
  getPeer(): RTCPeerConnection | undefined;
  resetPeer(newPeer: RTCPeerConnection): void;
  connect(opts?: AdapterConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
}

interface MediaConstraints {
  audioOnly?: boolean;
  videoOnly?: boolean;
}

const DEFAULT_CONNECT_TIMEOUT = 2000;

enum WHEPType {
  Client,
  Server,
}

class WHEPAdapter implements Adapter {
  private localPeer: RTCPeerConnection | undefined;
  private channelUrl: URL;
  private debug = false;
  private whepType: WHEPType;
  private waitingForCandidates = false;
  private iceGatheringTimeout: ReturnType<typeof setTimeout> | undefined;
  private resource: string | null = null;
  private onErrorHandler: (error: string) => void;
  private audio: boolean;
  private video: boolean;
  private mediaConstraints: MediaConstraints;

  constructor(
    peer: RTCPeerConnection,
    channelUrl: URL,
    onError: (error: string) => void,
    mediaConstraints: MediaConstraints,
  ) {
    this.mediaConstraints = mediaConstraints;
    this.channelUrl = channelUrl;
    if (typeof this.channelUrl === 'string') {
      throw new Error(`channelUrl parameter expected to be an URL not a string`);
    }
    this.whepType = WHEPType.Client;

    this.onErrorHandler = onError;
    this.audio = !this.mediaConstraints.videoOnly;
    this.video = !this.mediaConstraints.audioOnly;
    this.resetPeer(peer);
  }

  enableDebug() {
    this.debug = true;
  }

  resetPeer(newPeer: RTCPeerConnection) {
    this.localPeer = newPeer;
    this.localPeer.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this);
    this.localPeer.onicecandidate = this.onIceCandidate.bind(this);
  }

  getPeer(): RTCPeerConnection | undefined {
    return this.localPeer;
  }

  async connect(opts?: AdapterConnectOptions) {
    try {
      await this.initSdpExchange();
    } catch (error) {
      console.error((error as Error).toString());
    }
  }

  async disconnect() {
    if (this.resource) {
      this.log(`Disconnecting by removing resource ${this.resource}`);
      const response = await fetch(this.resource, {
        method: 'DELETE',
      });
      if (response.ok) {
        this.log(`Successfully removed resource`);
      }
    }
  }

  private async initSdpExchange() {
    clearTimeout(this.iceGatheringTimeout);

    if (this.localPeer && this.whepType === WHEPType.Client) {
      if (this.video) this.localPeer.addTransceiver('video', { direction: 'recvonly' });
      if (this.audio) this.localPeer.addTransceiver('audio', { direction: 'recvonly' });
      const offer = await this.localPeer.createOffer();

      // To add NACK in offer we have to add it manually see https://bugs.chromium.org/p/webrtc/issues/detail?id=4543 for details
      if (offer.sdp) {
        const opusCodecId = offer.sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);

        if (opusCodecId !== null) {
          offer.sdp = offer.sdp.replace(
            'opus/48000/2\r\n',
            'opus/48000/2\r\na=rtcp-fb:' + opusCodecId[1] + ' nack\r\n',
          );
        }
      }

      await this.localPeer.setLocalDescription(offer);
      this.waitingForCandidates = true;
      this.iceGatheringTimeout = setTimeout(
        this.onIceGatheringTimeout.bind(this),
        DEFAULT_CONNECT_TIMEOUT,
      );
    } else {
      if (this.localPeer) {
        const offer = await this.requestOffer();
        await this.localPeer.setRemoteDescription({
          type: 'offer',
          sdp: offer,
        });
        const answer = await this.localPeer.createAnswer();
        try {
          await this.localPeer.setLocalDescription(answer);
          this.waitingForCandidates = true;
          this.iceGatheringTimeout = setTimeout(
            this.onIceGatheringTimeout.bind(this),
            DEFAULT_CONNECT_TIMEOUT,
          );
        } catch (error) {
          this.log(answer.sdp);
          throw error;
        }
      }
    }
  }

  private async onIceCandidate(event: Event) {
    if (event.type !== 'icecandidate') {
      return;
    }
    const candidateEvent = <RTCPeerConnectionIceEvent>event;
    const candidate: RTCIceCandidate | null = candidateEvent.candidate;
    if (!candidate) {
      return;
    }

    this.log(candidate.candidate);
  }

  private onIceGatheringStateChange(event: Event) {
    if (this.localPeer) {
      this.log('IceGatheringState', this.localPeer.iceGatheringState);
      if (this.localPeer.iceGatheringState !== 'complete' || !this.waitingForCandidates) {
        return;
      }

      this.onDoneWaitingForCandidates();
    }
  }

  private onIceGatheringTimeout() {
    this.log('IceGatheringTimeout');

    if (!this.waitingForCandidates) {
      return;
    }

    this.onDoneWaitingForCandidates();
  }

  private async onDoneWaitingForCandidates() {
    this.waitingForCandidates = false;
    clearTimeout(this.iceGatheringTimeout);

    if (this.whepType === WHEPType.Client) {
      await this.sendOffer();
    } else {
      await this.sendAnswer();
    }
  }

  private getResouceUrlFromHeaders(headers: Headers): string | null {
    if (headers.get('Location') && headers.get('Location')?.match(/^\//)) {
      const resourceUrl = new URL(headers.get('Location')!, this.channelUrl.origin);
      return resourceUrl.toString();
    } else {
      return headers.get('Location');
    }
  }

  private async requestOffer() {
    if (this.whepType === WHEPType.Server) {
      this.log(`Requesting offer from: ${this.channelUrl}`);
      const response = await fetch(this.channelUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: '',
      });
      if (response.ok) {
        this.resource = this.getResouceUrlFromHeaders(response.headers);
        this.log('WHEP Resource', this.resource);
        const offer = await response.text();
        this.log('Received offer', offer);
        return offer;
      } else {
        const serverMessage = await response.text();
        throw new Error(serverMessage);
      }
    }
  }

  private async sendAnswer() {
    if (!this.localPeer) {
      this.log('Local RTC peer not initialized');
      return;
    }

    if (this.whepType === WHEPType.Server && this.resource) {
      const answer = this.localPeer.localDescription;
      if (answer) {
        const response = await fetch(this.resource, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/sdp',
          },
          body: answer.sdp,
        });
        if (!response.ok) {
          this.error(`sendAnswer response: ${response.status}`);
        }
      }
    }
  }

  private async sendOffer() {
    if (!this.localPeer) {
      this.log('Local RTC peer not initialized');
      return;
    }

    const offer = this.localPeer.localDescription;

    if (this.whepType === WHEPType.Client && offer) {
      this.log(`Sending offer to ${this.channelUrl}`);
      const response = await fetch(this.channelUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (response.ok) {
        this.resource = this.getResouceUrlFromHeaders(response.headers);
        this.log('WHEP Resource', this.resource);
        const answer = await response.text();
        await this.localPeer.setRemoteDescription({
          type: 'answer',
          sdp: answer,
        });
      } else if (response.status === 400) {
        this.log(`server does not support client-offer, need to reconnect`);
        this.whepType = WHEPType.Server;
        this.onErrorHandler('reconnectneeded');
      } else if (
        response.status === 406 &&
        this.audio &&
        !this.mediaConstraints.audioOnly &&
        !this.mediaConstraints.videoOnly
      ) {
        this.log(`maybe server does not support audio. Let's retry without audio`);
        this.audio = false;
        this.video = true;
        this.onErrorHandler('reconnectneeded');
      } else if (
        response.status === 406 &&
        this.video &&
        !this.mediaConstraints.audioOnly &&
        !this.mediaConstraints.videoOnly
      ) {
        this.log(`maybe server does not support video. Let's retry without video`);
        this.audio = true;
        this.video = false;
        this.onErrorHandler('reconnectneeded');
      } else {
        this.error(`sendAnswer response: ${response.status}`);
        this.onErrorHandler('connectionfailed');
      }
    }
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log('WebRTC-player', ...args);
    }
  }

  private error(...args: any[]) {
    console.error('WebRTC-player', ...args);
  }
}
