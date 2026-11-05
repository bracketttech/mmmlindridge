import sunset from "@/assets/property-sunset-gardens.jpg";
import rosebank from "@/assets/property-rosebank-lofts.jpg";
import bryanston from "@/assets/property-bryanston-villas.jpg";
import campsBay from "@/assets/property-camps-bay.jpg";

const MAP: Record<string, string> = { p1: sunset, p2: rosebank, p3: bryanston, p4: campsBay };
export const propertyImage = (id: string) => MAP[id];
