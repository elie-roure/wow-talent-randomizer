import { Specialization } from "./specialization";

export class PlayableClass {
  id: number;
  name: string;
  media: string;
  specializations: Specialization[];

  constructor(data: any, mediaUrl: string, specializations: Specialization[]) {
    this.id = data.id;
    this.name = data.name;
    this.media = mediaUrl;
    this.specializations = specializations;
  }

}