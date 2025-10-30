export class Specialization {
  id: number;
  name: string;
  media: string;

  constructor(data: any, mediaUrl: string) {
    this.id = data.id;
    this.name = data.name;
    this.media = mediaUrl;
  }
}