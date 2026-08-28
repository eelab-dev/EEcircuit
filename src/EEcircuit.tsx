"use client";

import React from "react";
import { Box, Flex, Skeleton } from "@chakra-ui/react";

const loadEEcircuitApp = () => import("./EEcircuitApp.tsx");
const EEcircuitApp = React.lazy(loadEEcircuitApp);

const LogoPlaceholder: React.FC = () => (
  <Box color="fg" display="inline-flex">
    <svg
      aria-label="EEcircuit logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 121.49 35.03"
      height="3em"
      fill="currentColor"
    >
      <g>
        <path d="M2.2,31.54V4.47h14.73v5.26h-8.44v4.97h7.79v5.43h-7.79v5.91h8.44v5.5H2.2Z" />
        <path d="M20.85,31.54V4.47h14.73v5.26h-8.44v4.97h7.79v5.43h-7.79v5.91h8.44v5.5h-14.73Z" />
      </g>
      <g>
        <path d="M49.02,24.78l5.16-.19c-.15,2-.9,3.65-2.24,4.94-1.35,1.29-2.98,1.93-4.91,1.93-2.04,0-3.76-.71-5.17-2.13-1.41-1.42-2.11-3.16-2.11-5.22s.71-3.63,2.13-5.02,3.12-2.09,5.11-2.09c1.73,0,3.27.55,4.59,1.64s2.15,2.49,2.48,4.19l-5.27.2c-.45-.59-1.03-.89-1.73-.89-.59,0-1.08.19-1.46.58-.38.39-.57.88-.57,1.48s.2,1.11.61,1.52c.4.41.91.61,1.51.61.88,0,1.51-.51,1.88-1.54Z" />
        <path d="M61.65,17.29v13.87h-5.21v-13.87h5.21ZM59.06,11.1c.71,0,1.32.25,1.83.74.52.5.77,1.08.77,1.76,0,.72-.24,1.32-.73,1.78-.49.46-1.11.7-1.87.7s-1.38-.23-1.87-.7c-.49-.46-.73-1.06-.73-1.78,0-.68.26-1.26.77-1.76.51-.5,1.12-.74,1.83-.74Z" />
        <path d="M72.33,17.15v5.57c-.36-.2-.69-.31-.99-.31-.95,0-1.42.72-1.42,2.17v6.58h-5.21v-7.58c0-2,.55-3.6,1.64-4.79,1.09-1.19,2.56-1.79,4.38-1.79.41,0,.94.05,1.59.15Z" />
        <path d="M82.37,24.78l5.16-.19c-.15,2-.9,3.65-2.24,4.94-1.35,1.29-2.98,1.93-4.91,1.93-2.04,0-3.76-.71-5.17-2.13-1.41-1.42-2.11-3.16-2.11-5.22s.71-3.63,2.13-5.02,3.12-2.09,5.11-2.09c1.73,0,3.27.55,4.59,1.64s2.15,2.49,2.48,4.19l-5.27.2c-.45-.59-1.03-.89-1.73-.89-.59,0-1.08.19-1.46.58-.38.39-.57.88-.57,1.48s.2,1.11.61,1.52c.4.41.91.61,1.51.61.88,0,1.51-.51,1.88-1.54Z" />
        <path d="M89.81,17.49h5.21v7.83c0,.79.33,1.18.99,1.18s.97-.39.97-1.18v-7.83h5.2v7.74c0,1.8-.6,3.32-1.8,4.56-1.2,1.24-2.66,1.86-4.4,1.86-1.98,0-3.57-.72-4.77-2.16-.94-1.12-1.41-2.68-1.41-4.68v-7.32Z" />
        <path d="M110.42,17.29v13.87h-5.21v-13.87h5.21ZM107.83,11.1c.71,0,1.32.25,1.83.74.52.5.77,1.08.77,1.76,0,.72-.24,1.32-.73,1.78-.49.46-1.11.7-1.87.7s-1.38-.23-1.87-.7c-.49-.46-.73-1.06-.73-1.78,0-.68.26-1.26.77-1.76.51-.5,1.12-.74,1.83-.74Z" />
        <path d="M118.11,12.17v5.32h2.34v5.5h-2.34c0,1.1.17,1.86.52,2.28.35.42.99.63,1.91.63v5.47c-.27,0-.47.01-.6.01-1.18,0-2.29-.27-3.33-.82-1.04-.55-1.88-1.29-2.51-2.23-.8-1.2-1.2-2.78-1.2-4.76v-11.4h5.2Z" />
      </g>
    </svg>
  </Box>
);

const AppLoadingShell: React.FC = () => (
  <Box
    border="solid 0px"
    p={2}
    height="100vh"
    display="flex"
    flexDirection="column"
    overflow="hidden"
    bg="bg"
  >
    <Flex
      direction={{ base: "column", md: "row" }}
      alignItems={{ base: "stretch", md: "center" }}
      justifyContent="space-between"
      gap={{ base: 4, md: 6 }}
      flexShrink={0}
      p={2}
    >
      <Flex alignItems="center" gap={3} justifyContent="flex-start">
        <LogoPlaceholder />
        <Skeleton
          height="20px"
          width="120px"
          borderRadius="md"
          display={{ base: "none", md: "block" }}
        />
      </Flex>

      <Flex
        alignItems="center"
        gap={3}
        width={{ base: "100%", md: "auto" }}
        justifyContent={{ base: "space-between", md: "center" }}
      >
        <Skeleton
          height="32px"
          borderRadius="md"
          flex={{ base: 1, md: "0 0 90px" }}
        />
        <Skeleton
          height="32px"
          borderRadius="md"
          flex={{ base: 1, md: "0 0 90px" }}
        />
        <Skeleton
          height="32px"
          borderRadius="md"
          flex={{ base: 1, md: "0 0 90px" }}
        />
      </Flex>

      <Flex
        alignItems="center"
        gap={3}
        justifyContent="flex-end"
        width={{ base: "100%", md: "auto" }}
      >
        <Skeleton height="36px" width="36px" borderRadius="md" />
        <Skeleton
          height="36px"
          width={{ base: "120px", md: "160px" }}
          borderRadius="md"
        />
      </Flex>
    </Flex>

    <Box
      flex={1}
      width="100%"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.muted"
      bg="bg.subtle"
      p={{ base: 3, md: 6 }}
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <Skeleton
        height="28px"
        width={{ base: "60%", md: "30%" }}
        borderRadius="md"
      />
      <Skeleton flex={1} borderRadius="lg" />
    </Box>
  </Box>
);

const EEcircuit: React.FC = () => {
  return (
    <React.Suspense fallback={<AppLoadingShell />}>
      <EEcircuitApp />
    </React.Suspense>
  );
};

export default EEcircuit;
