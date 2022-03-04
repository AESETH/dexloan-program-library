import * as anchor from "@project-serum/anchor";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Heading as DialogHeading,
  Header,
  Flex,
  Text,
  View,
  Link as SpectrumLink,
  ProgressCircle,
} from "@adobe/react-spectrum";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import type { NextPage } from "next";
import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-toastify";

import type { Listing } from "../types";
import * as utils from "../utils";
import * as web3 from "../lib/web3";
import { useListingsQuery } from "../hooks/query";
import { useWalletConnect } from "../components/button";
import { Card, CardFlexContainer } from "../components/card";
import { LoadingPlaceholder } from "../components/progress";
import { Body, Heading, Typography } from "../components/typography";
import { Main } from "../components/layout";
import { LoanDialog } from "../components/dialog";

const Listings: NextPage = () => {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [handleConnect] = useWalletConnect();
  const queryClient = useQueryClient();
  const queryResult = useListingsQuery(connection);

  const [selectedListing, setDialog] = useState<Listing | null>(null);

  const mutation = useMutation(
    () => {
      if (anchorWallet && selectedListing) {
        return web3.createLoan(
          connection,
          anchorWallet,
          selectedListing.account.mint,
          selectedListing.account.borrower,
          selectedListing.publicKey
        );
      }
      throw new Error("Not ready");
    },
    {
      onSuccess() {
        queryClient.setQueryData(["listings"], (data: any) => {
          if (data) {
            return data?.filter(
              (item: any) =>
                item.listing.publicKey.toBase58() !==
                selectedListing?.publicKey.toBase58()
            );
          }
        });

        queryClient.invalidateQueries([
          "loans",
          anchorWallet?.publicKey.toBase58(),
        ]);

        setDialog(null);

        toast.success("Listing created");
      },
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
    }
  );

  async function onCreateLoan(item: any) {
    if (anchorWallet) {
      setDialog(item.listing);
    } else {
      handleConnect(() => setDialog(item.listing));
    }
  }
  console.log(
    "listings: ",
    queryResult.data?.[0]?.listing.publicKey.toBase58()
  );
  return (
    <>
      {queryResult.isLoading ? (
        <LoadingPlaceholder />
      ) : (
        <Main>
          <CardFlexContainer>
            {queryResult.data?.map(
              (item) =>
                item && (
                  <Card
                    key={item?.listing.publicKey?.toBase58()}
                    uri={item.metadata.data?.data?.uri}
                  >
                    <Typography>
                      <Heading size="S">
                        {item.metadata.data?.data?.name}
                      </Heading>
                      <Body size="S">
                        Lend&nbsp;
                        {item.listing.account.amount.toNumber() /
                          anchor.web3.LAMPORTS_PER_SOL}
                        &nbsp;SOL for upto&nbsp;
                        <strong>
                          {utils.toMonths(
                            item.listing.account.duration.toNumber()
                          )}
                          &nbsp;months @&nbsp;
                        </strong>
                        <strong>
                          {item.listing.account.basisPoints / 100}%
                        </strong>
                        &nbsp;APY.{" "}
                        <SpectrumLink>
                          <a
                            href={`https://explorer.solana.com/address/${item.listing.account.mint.toBase58()}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View in Explorer
                          </a>
                        </SpectrumLink>
                      </Body>
                    </Typography>
                    <Divider size="S" marginTop="size-600" />
                    <Flex direction="row" justifyContent="end">
                      <Button
                        variant="cta"
                        marginY="size-200"
                        onPress={() => onCreateLoan(item)}
                      >
                        Lend
                      </Button>
                    </Flex>
                  </Card>
                )
            )}
          </CardFlexContainer>
        </Main>
      )}

      <LoanDialog
        selectedListing={selectedListing}
        loading={mutation.isLoading}
        onRequestClose={() => setDialog(null)}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
};

export default Listings;
