"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useProject from "@/hooks/use-project";
import MDEditor from "@uiw/react-md-editor";
import React, { useEffect } from "react";
import { repoStructure } from "./actions";
import { LoaderIcon } from "lucide-react";

const RepoStructureCard = () => {
  const { project } = useProject();
  const [structure, setStructure] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    const structureRepo = async () => {
      if (!project?.id) return;
      setLoading(true);
      const response = await repoStructure(project.id);
      setStructure(response || "");
      setLoading(false);
    };
    structureRepo();
  }, [project?.id]);

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center text-white">
          <p>Loading </p>
          <LoaderIcon className="animate-spin text-white" />
        </div>
      ) : (
        <Card className="relative border-gray-600 bg-gray-800 text-white sm:p-2">
          <CardContent>
            <MDEditor.Markdown
              source={structure}
              className="rounded-md p-5"
            />
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default RepoStructureCard;
