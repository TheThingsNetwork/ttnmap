export interface GatewayLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface Gateway {
  netID: string;
  tenantID: string;
  id: string;
  eui?: string;
  clusterID?: string;
  updatedAt: string;
  location?: GatewayLocation;
  antennaPlacement?: 'INDOOR' | 'OUTDOOR';
  online: boolean;
  name?: string;
}

export type GatewayCategory = 'ttn' | 'private';
