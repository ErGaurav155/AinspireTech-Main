"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Label } from "@ainspiretech/ui/components/radix/label";
import { Input } from "@ainspiretech/ui/components/radix/input";
import { Textarea } from "@ainspiretech/ui/components/radix/textarea";
import { Button } from "@ainspiretech/ui/components/radix/button";
import { Badge } from "@ainspiretech/ui/components/radix/badge";

interface TemplateFormProps {
  accountId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TemplateForm({
  accountId,
  onSuccess,
  onCancel,
}: TemplateFormProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [triggerInput, setTriggerInput] = useState("");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [priority, setPriority] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTrigger = () => {
    if (
      triggerInput.trim() &&
      !triggers.includes(triggerInput.trim().toLowerCase())
    ) {
      setTriggers([...triggers, triggerInput.trim().toLowerCase()]);
      setTriggerInput("");
    }
  };

  const removeTrigger = (trigger: string) => {
    setTriggers(triggers.filter((t) => t !== trigger));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTrigger();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess?.();
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={name}
          className="bg-gray-800"
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Welcome Message, Product Inquiry"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Reply Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your automated reply message..."
          className="min-h-[100px] bg-gray-800"
          required
        />
        <p className="text-xs text-muted-foreground">
          {content.length}/500 characters
        </p>
      </div>

      <div className="space-y-2 ">
        <Label htmlFor="triggers">Trigger Keywords</Label>
        <div className="flex gap-2">
          <Input
            id="triggers"
            value={triggerInput}
            onChange={(e) => setTriggerInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-gray-800"
            placeholder="Add a keyword that triggers this reply"
          />
          <Button
            className="bg-[#0f5833]"
            type="button"
            onClick={addTrigger}
            variant="outline"
          >
            Add
          </Button>
        </div>

        {triggers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {triggers.map((trigger, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {trigger}
                <button
                  type="button"
                  onClick={() => removeTrigger(trigger)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          When someone comments with these keywords, this template will be used
          for the reply
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          min="1"
          max="10"
          className="bg-gray-800 text-gray-500"
          value={priority}
          onChange={(e) => setPriority(parseInt(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          Higher priority templates (1-10) are checked first
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#1a3f6c] text-white"
        >
          {isSubmitting ? "Creating..." : "Create Template"}
        </Button>
        {onCancel && (
          <Button
            className="bg-[#d61a1a]"
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
