import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  Group,
  Textarea,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// Get the actual value at the given path from the full JSON
const getValueAtPath = (fullJson: any, path?: (string | number)[]) => {
  if (!path || path.length === 0) return fullJson;

  let current = fullJson;
  for (const segment of path) {
    current = current[segment];
  }
  return current;
};

// return object from json removing array and object fields (for display purposes only)
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const setJson = useJson(state => state.setJson);
  const getJson = useJson(state => state.getJson);
  const setContents = useFile(state => state.setContents);

  const normalizedData = normalizeNodeData(nodeData?.text ?? []);

  const handleEdit = () => {
    try {
      const fullJson = JSON.parse(getJson());
      const actualValue = getValueAtPath(fullJson, nodeData?.path);
      setEditedContent(JSON.stringify(actualValue, null, 2));
      setIsEditing(true);
    } catch (error) {
      console.error("Error getting value at path:", error);
    }
  };

  const handleSave = () => {
    try {
      // Parse the edited content to validate it's valid JSON
      const editedJson = JSON.parse(editedContent);

      // Get the current full JSON
      const fullJson = JSON.parse(getJson());

      // Get the path to this node
      const path = nodeData?.path ?? [];

      // Navigate to the parent and update the value
      let current = fullJson;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      if (path.length > 0) {
        current[path[path.length - 1]] = editedJson;
      } else {
        // Root level update
        Object.assign(fullJson, editedJson);
      }

      // Update both stores
      const updatedJsonString = JSON.stringify(fullJson, null, 2);
      setJson(updatedJsonString);
      setContents({ contents: updatedJsonString, hasChanges: true });

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error("Invalid JSON:", error);
      alert("Invalid JSON format. Please check your input.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent("");
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <CloseButton onClick={onClose} />
          </Flex>

          {isEditing ? (
            <Stack gap="xs">
              <Textarea
                value={editedContent}
                onChange={e => setEditedContent(e.currentTarget.value)}
                placeholder="Enter JSON content"
                minRows={6}
                maxRows={15}
                style={{ fontFamily: "monospace", fontSize: "12px" }}
              />
              <Group justify="flex-end">
                <Button variant="default" size="xs" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="xs" onClick={handleSave}>
                  Save
                </Button>
              </Group>
            </Stack>
          ) : (
            <>
              <ScrollArea.Autosize mah={250} maw={600}>
                <CodeHighlight
                  code={normalizedData}
                  miw={350}
                  maw={600}
                  language="json"
                  withCopyButton
                />
              </ScrollArea.Autosize>
              <Button size="xs" onClick={handleEdit}>
                Edit
              </Button>
            </>
          )}
        </Stack>

        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
