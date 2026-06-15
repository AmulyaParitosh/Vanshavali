export interface Family {
  id: string;
  husband?: string; // Person ID (Male)
  wife?: string; // Person ID (Female)
  children: string[]; // Array of Person IDs
  partners?: string[]; // Deprecated: use husband/wife instead
}
