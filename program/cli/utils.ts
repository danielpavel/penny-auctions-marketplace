import { PublicKey, Umi } from "@metaplex-foundation/umi";
import {
  bytes,
  publicKey as publicKeySerializer,
} from "@metaplex-foundation/umi/serializers";

export const getUserAccountPda = (
  umi: Umi,
  marketplace: PublicKey,
  user: PublicKey
) => {
  return umi.eddsa.findPda(umi.programs.getPublicKey("nftMarketplace"), [
    bytes().serialize(new Uint8Array([117, 115, 101, 114])),
    publicKeySerializer().serialize(marketplace),
    publicKeySerializer().serialize(user),
  ]);
};

export const getMarketplaceTreasuryPda = (umi: Umi, marketplace: PublicKey) => {
  return umi.eddsa.findPda(umi.programs.getPublicKey("nftMarketplace"), [
    bytes().serialize(new Uint8Array([116, 114, 101, 97, 115, 117, 114, 121])),
    publicKeySerializer().serialize(marketplace),
  ]);
};
