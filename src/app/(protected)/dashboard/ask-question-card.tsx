"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import React from "react";
import { askQuestion, repoStructure, summarizeRepo } from "./actions";
import { readStreamableValue } from "ai/rsc";
import MDEditor from "@uiw/react-md-editor";
import { CodeReferences } from "./code-references";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import useRefetch from "@/hooks/use-refetch";
import { Github, Info, LoaderIcon } from "lucide-react";

const AskQuestionCard = () => {
  const refetch = useRefetch();
  const { project } = useProject();
  const [question, setQuestion] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [open2, setOpen2] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [filesReferences, setFilesReferences] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = React.useState("");
  const [repositorySummary, setRepositorySummary] = React.useState("");
  const saveAnswer = api.project.saveAnswer.useMutation();
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setAnswer("");
    setFilesReferences([]);
    e.preventDefault();
    if (!project?.id) return;
    setLoading(true);

    const { output, fileReference } = await askQuestion(question, project.id);
    setOpen(true);
    setFilesReferences(fileReference);

    for await (const delta of readStreamableValue(output)) {
      if (delta) {
        setAnswer((ans) => ans + delta);
      }
    }
    setLoading(false);
  };

  const repoSummary = async () => {
    if (!project?.id) return;
    setLoading(true);
    setRepositorySummary("");
    const response = await summarizeRepo(project!.id);
    setOpen2(true);
    setRepositorySummary(response || "");
    setLoading(false);
  };
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="scrollbar-webkit sm:max-h-[90vh] max-h-[75vh] sm:max-w-[80vw] max-w-[95vw] overflow-y-scroll border-gray-700 bg-gray-800 text-white">
          <div className="flex items-center sm:gap-5 gap-2">
            <DialogHeader>
              <DialogTitle className="flex flex-row items-center justify-center gap-2">
                <Github className="animate-pulse-scale h-5 w-5 text-green-400" />
                <p className="text-xl font-bold text-white transition-transform duration-300 hover:scale-105 md:text-2xl">
                  GitHive
                </p>
              </DialogTitle>
            </DialogHeader>
            <Button
              disabled={saveAnswer.isPending}
              className="text-md"
              onClick={() => {
                saveAnswer.mutate(
                  {
                    projectId: project!.id,
                    answer,
                    question,
                    filesReferences,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Answer Saved !!");
                      refetch();
                    },
                    onError: () => {
                      toast.error("Error Saving Answer !!");
                    },
                  },
                );
              }}
            >
              Save Answer
            </Button>
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-gray-500 px-2 py-1">
              <Info size={20} />
              <p className="text-sm text-gray-400">
                Answer will be added on the Saved Q&A Page
              </p>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2 rounded-md border border-gray-500 px-2 py-1">
              <Info size={20} />
              <p className="text-sm text-gray-400">
                Answer will be added on the Saved Q&A Page
              </p>
            </div>
          <MDEditor.Markdown
            source={answer}
            className=" p-5 rounded-md sm:max-w-[73vw]"
          />
          <div className="h-3"></div>

          <CodeReferences filesReferences={filesReferences} />

          <Button
            type="button"
            className="text-md w-fit"
            variant="destructive"
            onClick={() => {
              setOpen(false);
            }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
      {/*dialog for summary of repo */}
      <Dialog open={open2} onOpenChange={setOpen2}>
        <DialogContent className="max-h-[75vh] sm:max-h-[90vh] max-w-[95vw] sm:max-w-[80vw] overflow-y-scroll scrollbar-webkit border-gray-700 bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex flex-row items-center">
              <Github className="animate-pulse-scale h-5 w-5 text-green-400" />
              <p className="text-xl font-bold text-white transition-transform duration-300 hover:scale-105 md:text-2xl">
                GitHive
              </p>
            </DialogTitle>
          </DialogHeader>
          <MDEditor.Markdown
            source={repositorySummary}
            className="rounded-md p-5"
          />
          <Button
            type="button"
            className="text-md w-fit"
            variant="destructive"
            onClick={() => {
              setOpen2(false);
            }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
      {/*main card */}
      <Card className="relative border-gray-600 bg-gray-800 text-white">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Textarea
              placeholder="Ask about any file in the repository. Ex: Which file should i edit to change the home page?"
              value={question}
              className="font-medium text-sm sm:text-sm md:text-md text-gray-950 bg-gray-300"
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="h-4"></div>
            <Button type="submit" disabled={loading}>
              Ask GitHive
              {loading&&<LoaderIcon className="animate-spin text-white"/>}
            </Button>
            <Button
              className="ml-3"
              disabled={loading}
              type="button"
              onClick={() => {
                repoSummary();
              }}
            >
              Summarize Repo
              {loading&&<LoaderIcon className="animate-spin text-white"/>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
