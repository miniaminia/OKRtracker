export const OBJECTIVES = [
  {
    id: "obj1",
    icon: "📐",
    title: "디자인 가이드 정리 자료 만들어 팀과 공유하기",
    desc: "팀원들이 가이드를 쉽게 이해하고 참고할 수 있도록 설명 자료를 만들고 꾸준히 공유한다",
    color: "#3B6CFF",
    keyResults: [
      { id: "kr1-1", label: "가이드 설명 자료 제작", target: 3, unit: "건", period: "합계 3건" },
      { id: "kr1-2", label: "팀 내 배포", target: 12, unit: "회", period: "월 1회" },
    ],
  },
  {
    id: "obj2",
    icon: "🗂️",
    title: "PL로서 디자인 일정과 이슈를 미리 챙기기",
    desc: "문제가 생기기 전에 먼저 확인하고 조율한다. PA 업무 배분부터 진행 현황 공유, 소통까지 직접 챙긴다",
    color: "#10B981",
    keyResults: [
      { id: "kr2-1", label: "업무보고 공유", target: 52, unit: "회", period: "주 1회", noTrack: true },
      { id: "kr2-2", label: "PA 업무 배분 (담당 프로젝트)", target: 100, unit: "%", period: "전건", noTrack: true },
      { id: "kr2-3", label: "아침 스크럼 회의", target: 260, unit: "회", period: "매일", noTrack: true },
      { id: "kr2-4", label: "PA 면담", target: 4, unit: "회", period: "분기 1회" },
    ],
  },
  {
    id: "obj3",
    icon: "🤖",
    title: "AI 툴로 반복 업무 줄이고 팀에 퍼뜨리기",
    desc: "AI를 활용해 시간이 걸리는 작업을 빠르게 처리하는 방법을 찾고, 팀 전체가 쓸 수 있도록 공유한다",
    color: "#F59E0B",
    keyResults: [
      { id: "kr3-1", label: "AI 활용 개선 사례", target: 3, unit: "건", period: "합계 3건" },
      { id: "kr3-2", label: "팀 내 실제 적용", target: 2, unit: "건", period: "합계 2건" },
    ],
  },
];
