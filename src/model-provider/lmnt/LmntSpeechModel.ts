import { AbstractModel } from "../../model-function/AbstractModel.js";
import { ApiConfiguration } from "../../core/api/ApiConfiguration.js";
import { FunctionOptions } from "../../core/FunctionOptions.js";
import {
  SpeechGenerationModel,
  SpeechGenerationModelSettings,
} from "../../model-function/generate-speech/SpeechGenerationModel.js";
import { callWithRetryAndThrottle } from "../../core/api/callWithRetryAndThrottle.js";
import {
  createAudioMpegResponseHandler,
  postToApi,
} from "../../core/api/postToApi.js";
import { LmntApiConfiguration } from "./LmntApiConfiguration.js";
import { failedLmntCallResponseHandler } from "./LmntError.js";

export interface LmntSpeechModelSettings extends SpeechGenerationModelSettings {
  api?: ApiConfiguration;

  voice: string;

  speed?: number;
  seed?: number;
  length?: number;
}

/**
 * Synthesize speech using the LMNT API.
 *
 * @see https://www.lmnt.com/docs/rest/#synthesize-speech
 */
export class LmntSpeechModel
  extends AbstractModel<LmntSpeechModelSettings>
  implements SpeechGenerationModel<LmntSpeechModelSettings>
{
  constructor(settings: LmntSpeechModelSettings) {
    super({ settings });
  }

  readonly provider = "lmnt";

  get modelName() {
    return this.settings.voice;
  }

  private async callAPI(
    text: string,
    options?: FunctionOptions
  ): Promise<Buffer> {
    return callWithRetryAndThrottle({
      retry: this.settings.api?.retry,
      throttle: this.settings.api?.throttle,
      call: async () =>
        callLmntTextToSpeechAPI({
          ...this.settings,
          abortSignal: options?.run?.abortSignal,
          text,
        }),
    });
  }

  get settingsForEvent(): Partial<LmntSpeechModelSettings> {
    return {
      voice: this.settings.voice,
      speed: this.settings.speed,
      seed: this.settings.seed,
      length: this.settings.length,
    };
  }

  doGenerateSpeechStandard(text: string, options?: FunctionOptions) {
    return this.callAPI(text, options);
  }

  withSettings(additionalSettings: Partial<LmntSpeechModelSettings>) {
    return new LmntSpeechModel({
      ...this.settings,
      ...additionalSettings,
    }) as this;
  }
}

async function callLmntTextToSpeechAPI({
  api = new LmntApiConfiguration(),
  abortSignal,
  text,
  voice,
  speed,
  seed,
  length,
}: {
  api?: ApiConfiguration;
  abortSignal?: AbortSignal;
  text: string;
  voice: string;
  speed?: number;
  seed?: number;
  length?: number;
}): Promise<Buffer> {
  const formData = new FormData();
  formData.append("text", text);
  formData.append("voice", voice);
  formData.append("format", "mp3");
  if (speed != null) formData.append("speed", speed.toString());
  if (seed != null) formData.append("seed", seed.toString());
  if (length != null) formData.append("length", length.toString());

  return postToApi({
    url: api.assembleUrl(`/synthesize`),
    headers: api.headers,
    body: {
      content: formData,
      values: {
        text,
        voice,
        speed,
        seed,
        length,
      },
    },
    failedResponseHandler: failedLmntCallResponseHandler,
    successfulResponseHandler: createAudioMpegResponseHandler(),
    abortSignal,
  });
}
