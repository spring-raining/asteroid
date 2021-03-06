import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from 'react';
import { LivePreview, withLive } from 'react-live';
import { nanoid } from 'nanoid';
import { line as spinner } from 'cli-spinners';
import { useColorMode } from '@chakra-ui/core';
import { CodeBlockStatus, UniverseContext } from '../../contexts/universe';
import { useEditorCallbacks } from './useEditorCallbacks';
import { Block, BlockEditorPane, BlockPreviewPane } from './Block';
import {
  InsertBlockToolbar,
  ManipulateBlockToolbar,
  ToolbarContainer,
} from './BlockToolBar';
import { Editor, EditorProps } from '../Editor';
import { CodeBlockProvider } from './CodeBlockProvider';
import * as UI from '../ui';

const LivedEditor = withLive<
  {
    live?: { code: string; onChange: (code: string) => void };
  } & Omit<EditorProps, 'code' | 'language'>
>(({ live, ...other }) => {
  const handleChange = useCallback(
    (text) => {
      if (other.onChange) {
        other.onChange(text);
      }
      live?.onChange(text);
    },
    [live?.onChange, other.onChange]
  );
  if (!live) {
    return null;
  }
  return (
    <Editor
      {...other}
      code={live.code}
      language="javascript"
      onChange={handleChange}
    />
  );
});

const LivedError = withLive<any>(({ live: { error } }) =>
  error ? (
    <UI.Box
      my={4}
      p={2}
      rounded="md"
      fontSize="70%"
      lineHeight="1.25"
      color="white"
      bg="red.600"
    >
      <pre>{error}</pre>
    </UI.Box>
  ) : null
);

export const CodeBlock: React.FC<{
  brickId: string;
  note: string;
  asteroidId: string;
  onEvaluateStart: (runId: string) => void;
  onEvaluateFinish: (runId: string, ret?: object | null) => void;
  onReady?: () => void;
}> = ({
  brickId,
  note,
  asteroidId,
  onEvaluateStart,
  onEvaluateFinish,
  onReady = () => {},
}) => {
  const { state } = useContext(UniverseContext);
  const { providence } = state;
  const editorCallbacks = useEditorCallbacks({ brickId });
  const { colorMode } = useColorMode();
  const [val, setVal] = useState<Promise<object | null>>();
  const [ready, setReady] = useState(false);
  const scope = useMemo(
    () => ({
      ...providence.imports.reduce(
        (acc, { modules }) => ({ ...acc, ...(modules || {}) }),
        {}
      ),
      ...(providence.asteroid[asteroidId]?.scope || {}),
    }),
    [asteroidId, providence.asteroid, providence.imports]
  );

  const status = providence.asteroid[asteroidId]?.status || null;

  useEffect(() => {
    if (ready) {
      onReady();
    }
  }, [ready, onReady]);

  // Evaluate code result
  const currentStatus = useRef<CodeBlockStatus | null>();
  const currentVal = useRef<Promise<object | null>>();
  const runIdRef = useRef<string>();
  const onEvaluateFinishRef = useRef<
    (runId: string, ret?: object | null) => void
  >();
  useEffect(() => {
    if (currentVal.current === val) {
      return;
    }
    currentStatus.current = status;
    currentVal.current = val;
    if (!val) {
      return;
    }
    const runId = nanoid();
    runIdRef.current = runId;
    onEvaluateFinishRef.current = onEvaluateFinish;
    onEvaluateStart(runId);
    requestAnimationFrame(() => {
      val
        .then((evaluated) => {
          if (
            runId !== runIdRef.current &&
            currentStatus.current !== 'running'
          ) {
            onEvaluateFinishRef.current!(runId);
          }
          onEvaluateFinishRef.current!(runId, evaluated);
        })
        .catch(() => {
          onEvaluateFinishRef.current!(runId);
        });
    });
  }, [val, providence, asteroidId]);

  const statusString = useMemo(() => {
    const asteroid = providence.asteroid[asteroidId];
    if (!asteroid) {
      return null;
    }
    const { status, stepNo } = asteroid;
    let str = '';
    if (stepNo) {
      str += `[${stepNo}]`;
    }
    if (status === 'outdated') {
      str += '*';
    }
    return str;
  }, [asteroidId, providence]);

  const [loadingSpinner, setLoadingSpinner] = useState<string | null>(null);
  useEffect(() => {
    if (status === 'running') {
      let frame = 0;
      const id = setInterval(() => {
        frame = (frame + 1) % spinner.frames.length;
        setLoadingSpinner(spinner.frames[frame]);
      }, 50);
      return () => clearInterval(id);
    } else {
      setLoadingSpinner(null);
    }
  }, [status]);

  const brickIndex = useMemo(
    () => state.bricks.findIndex((brick) => brick.brickId === brickId),
    [state.bricks, brickId]
  );
  const [hover, setHover] = useState(false);

  const blockCallbacks = {
    onMouseOver: useCallback(() => setHover(true), []),
    onMouseOut: useCallback(() => setHover(false), []),
  };

  return (
    <CodeBlockProvider
      {...{ status }}
      code={note}
      scope={scope}
      onRender={setVal}
    >
      <Block
        active={state.activeBrick === brickId}
        {...blockCallbacks}
        visibility={ready ? 'visible' : 'hidden'}
        height={ready ? 'auto' : 0}
      >
        {' '}
        <BlockEditorPane
          pos="relative"
          borderLeft="0.5rem solid"
          borderColor={
            status === 'live'
              ? colorMode === 'light'
                ? 'cyan.500'
                : 'cyan.600'
              : status === 'outdated'
              ? colorMode === 'light'
                ? 'orange.500'
                : 'orange.600'
              : colorMode === 'light'
              ? 'gray.400'
              : 'gray.600'
          }
        >
          <UI.Box
            top={[0, 28, 28, 28]}
            position={['relative', 'absolute', 'absolute', 'absolute']}
            ml={['40px', 0, 0, 0]}
          >
            {loadingSpinner && (
              <UI.Code fontSize="xs" backgroundColor="transparent">
                {loadingSpinner}
              </UI.Code>
            )}
            {statusString && (
              <UI.Code fontSize="xs" backgroundColor="transparent">
                {statusString}
              </UI.Code>
            )}
          </UI.Box>
          <LivedEditor {...editorCallbacks} onReady={() => setReady(true)} />
        </BlockEditorPane>
        <BlockPreviewPane sticky>
          <LivedError />
          <LivePreview />
        </BlockPreviewPane>
        {brickIndex === 0 && (
          <ToolbarContainer side="top" left={0} show={hover}>
            <InsertBlockToolbar index={0} />
          </ToolbarContainer>
        )}
        <ToolbarContainer side="bottom" left={0} show={hover}>
          <InsertBlockToolbar index={brickIndex + 1} />
        </ToolbarContainer>
        <ToolbarContainer side="bottom" right={0} show={hover}>
          <ManipulateBlockToolbar index={brickIndex} />
        </ToolbarContainer>
      </Block>
    </CodeBlockProvider>
  );
};
