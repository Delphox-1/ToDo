// Shared by local, Pages, and self-hosted modes.
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.ToDoSamples=api;
})(globalThis,()=>{
  'use strict';
  function create({today,uid,addDays}) {
  function samples() {
    if (globalThis.ToDoAccount)
      return { version: 1, tasks: [], projects: [], notes: {}, trash: [] };
    const t = today();
    return {
      version: 1,
      projects: [
        {
          id: "p-work",
          name: "업무 & 사이드 프로젝트",
          color: "#6c7de0",
          sample: true,
        },
        { id: "p-life", name: "나의 일상", color: "#44876e", sample: true },
        { id: "p-learn", name: "배움과 성장", color: "#d1954d", sample: true },
      ],
      notes: {},
      tasks: [
        {
          id: uid(),
          title: "이번 주 가장 중요한 목표 정하기",
          date: t,
          time: "09:00",
          priority: "high",
          project: "p-work",
          status: "done",
          star: true,
          notes: "예시 할 일이에요. 자유롭게 수정하거나 지워보세요.",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "새 프로젝트 아이디어 정리하기",
          date: t,
          time: "10:00",
          priority: "high",
          project: "p-work",
          status: "doing",
          star: true,
          notes: "아이디어 3개를 적고, 가장 해보고 싶은 하나를 골라보세요.",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "책 20페이지 읽고 한 줄 남기기",
          date: t,
          time: "13:00",
          priority: "medium",
          project: "p-learn",
          status: "todo",
          star: true,
          notes: "오늘 배운 것 한 가지는 무엇인가요?",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "가볍게 산책하며 리프레시",
          date: t,
          time: "17:30",
          priority: "low",
          project: "p-life",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "다음 주 일정 미리 살펴보기",
          date: t,
          time: "20:00",
          priority: "medium",
          project: "p-life",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "프로젝트 초안 작성",
          date: addDays(t, 2),
          time: "10:00",
          priority: "high",
          project: "p-work",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "온라인 강의 한 편 듣기",
          date: addDays(t, 3),
          time: "19:00",
          priority: "medium",
          project: "p-learn",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "언젠가 해보고 싶은 일 적기",
          date: "",
          time: "",
          priority: "low",
          project: "p-life",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
      ],
    };
  }
    return samples;
  }
  return {create};
});
