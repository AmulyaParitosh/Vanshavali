export interface PersonName {
  official_name: string;
  aliases?: string[];
}

export interface PersonEvent {
  type: string;
  date?: string;
  place?: string;
  description?: string;
}

export interface Person {
  id: string;
  name: PersonName;
  sex: 'M' | 'F';
  events?: PersonEvent[];
  custom_fields?: Record<string, string>;
  root?: boolean;
  image_url?: string;
  image_storage_path?: string;
  userId?: string;
}
