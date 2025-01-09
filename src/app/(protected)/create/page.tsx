"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { Info, LoaderIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { checkPrivate, checkValidRepo } from "../dashboard/actions";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();

  const [isPending, setIsPending] = useState(false);

  // On mount, set isPending from localStorage
  useEffect(() => {
    const pendingState =
      localStorage.getItem("createProjectPending") === "true";
    setIsPending(pendingState);

    // Optionally refetch to confirm operation is still pending (if API supports it)
  }, []);

  // Watch `isPending` state to update localStorage
  useEffect(() => {
    if (isPending) {
      localStorage.setItem("createProjectPending", "true");
      //window.dispatchEvent(new Event("projectPendingChanged"));
    } else {
      localStorage.removeItem("createProjectPending");
      //window.dispatchEvent(new Event("projectPendingChanged"));
    }
  }, [isPending]);

  async function onSubmit(data: FormInput) {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w-]+\/?$/;
    if (data.repoUrl.endsWith(".git")) {
      toast.error(`Remove ".git" from the end of the URL !!`);
      return;
    }
    if (!githubRegex.test(data.repoUrl)) {
      toast.error("Invalid GitHub repository URL");
      return;
    }

    setIsPending(true);
    const privRepo=await checkPrivate(data.repoUrl,data.githubToken)
    if (privRepo) {
      toast.error("Can't link private repository !!");
      setIsPending(false);
      return;
    }

    const validRepo = await checkValidRepo(data.repoUrl, data.githubToken);
    if (!validRepo) {
      toast.error("Can't find GitHub repository !!");
      setIsPending(false);
      return;
    }

    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project created successfully");
          refetch();
          reset();
          setIsPending(false);
        },
        onError: () => {
          toast.error("Failed to create project");
          setIsPending(false);
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 overflow-hidden sm:flex-row">
      <img src="/github.svg" className="h-56 w-auto"></img>
      <div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-white">
            Link your GitHub repository
          </h1>
          <p className="text-sm text-gray-400">
            Enter the URL of your repository to link it to GitHive
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true })}
              placeholder="Project Name"
              required
              className="bg-gray-300 text-black"
            />
            <div className="h-2"></div>
            <Input
              {...register("repoUrl", { required: true })}
              placeholder="Repository URL"
              required
              type="url"
              className="bg-gray-300 text-black"
            />
            <div className="h-2"></div>
            <Input
              {...register("githubToken")}
              placeholder="GitHub Token (Optional)"
              className="bg-gray-300 text-black"
            />
            <div className="h-4"></div>
            <Button
              type="submit"
              className="flex items-center"
              disabled={isPending || createProject.isPending}
            >
              Create Project
              {(isPending || createProject.isPending) && (
                <LoaderIcon className="animate-spin text-white" />
              )}
            </Button>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-gray-600 px-2 py-1">
              <Info size={20} className="text-gray-200" />
              <p className="text-sm text-gray-400">
                Wait 5-10 minutes, depends on the size of repo. Works on free
                API
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
