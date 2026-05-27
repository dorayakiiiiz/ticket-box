export type ZoneInfo = {
  id: string;
  name: string;
  price: number;
  color: string;
  available: number;
  type: string;
};

export type ArtistInfo = {
  name: string;
  role: string;
};

export type EventInfo = {
  id: number;
  name: string;
  subtitle: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: string;
  category: string;
  image: string;
  tag: string | null;
  tagStyle: string;
  sold: number;
  featured: boolean;
  description: string;
  artistList: ArtistInfo[];
};
