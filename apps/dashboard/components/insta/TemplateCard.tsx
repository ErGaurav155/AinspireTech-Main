"use client";

import { useState } from "react";

import { Edit2, Trash2, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ainspiretech/ui/components/radix/card";
import { Badge } from "@ainspiretech/ui/components/radix/badge";
import { Switch } from "@ainspiretech/ui/components/radix/switch";
import { Button } from "@ainspiretech/ui/components/radix/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ainspiretech/ui/components/radix/alert-dialog";

interface Template {
  _id: string;
  userId: string;
  accountId: string;
  name: string;
  content: string[];
  triggers: string[];
  isActive: boolean;
  priority: number;
  usageCount: number;
  lastUsed?: string;
  accountUsername: string;
}

interface TemplateCardProps {
  template: Template;
  onDelete: (id: string) => void;
  onEdit: (id: Template) => void;
  onToggle: (id: string) => void;
}

export default function TemplateCard({
  template,
  onDelete,
  onEdit,
  onToggle,
}: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Simulate API call
    setTimeout(() => {
      onDelete(template._id);
      setIsDeleting(false);
    }, 500);
  };

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return "Never used";

    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <Card
      className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${
        template.priority <= 3
          ? "from-[#FF2E9F]/10 to-[#FF2E9F]/5 border-[#FF2E9F]/10 hover:bg-[#FF2E9F]/10 "
          : template.priority <= 6
            ? "from-[#00F0FF]/10 to-[#00F0FF]/5 border-[#00F0FF]/10 hover:bg-[#00F0FF]/10 "
            : "from-[#ca7030]/10 to-[#ca7030]/5 border-[#ca7030]/10 hover:bg-[#ca7030]/10 "
      }bg-transparent backdrop-blur-sm border`}
    >
      <CardHeader className="p-3">
        <div className="flex flex-col md:flex-row items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {template.name}
              <Badge
                variant={template.isActive ? "default" : "secondary"}
                className="text-xs text-nowrap"
              >
                Priority {template.priority}
              </Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={template.isActive}
              onCheckedChange={() => onToggle(template._id)}
            />
            <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {template.name}? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Reply Content:</p>
          <div className="flex flex-wrap items-center justify-start w-full  gap-2">
            {/* {template.content} */}
            {template.content.map((content: any, index: number) => (
              <Badge
                key={index}
                variant="outline"
                className="text-sm text-wrap bg-white/5 p-3 rounded-md text-gray-300"
              >
                {content}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Trigger Keywords:
          </p>
          <div className="flex flex-wrap gap-1">
            {template.triggers.map((trigger, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {trigger}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {template.usageCount} uses
            </div>
            <div>Last used: {formatLastUsed(template.lastUsed)}</div>
          </div>
          <Badge variant={template.isActive ? "default" : "secondary"}>
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
