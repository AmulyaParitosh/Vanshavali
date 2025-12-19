export interface Family {
  id: string;
  husband?: string; // Person ID
  wife?: string; // Person ID
  children: string[]; // Array of Person IDs
}
