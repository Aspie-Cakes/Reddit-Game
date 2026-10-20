/** Future Suno tracks can implement this interface without changing the session engine. */
export interface MusicTrack {
  id: string;
  title: string;
  src: string;
  attribution?: string;
}
export interface MusicProvider {
  listTracks(): Promise<MusicTrack[]>;
}
export const musicProvider: MusicProvider = {
  async listTracks() {
    return [];
  },
};
