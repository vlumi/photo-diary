declare module "geo-coord" {
  export class GeoCoord {
    constructor(...args: unknown[]);
    toDD(): { latitude: number; longitude: number };
  }
}
